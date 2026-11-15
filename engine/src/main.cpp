#include <iostream>
#include <memory>
#include <vector>
#include <string>
#include <sstream>
#include <iomanip>
#include <chrono>
#include <algorithm>

#include "buffer/BufferPoolManager.hpp"
#include "memory/VirtualMemoryManager.hpp"
#include "replacement/LRU.hpp"
#include "replacement/FIFO.hpp"
#include "replacement/Clock.hpp"
#include "replacement/Optimal.hpp"
#include "metrics/MetricsCollector.hpp"
#include "workload/WorkloadGenerator.hpp"

struct StepFrameSnapshot {
    int frameId;
    int pageId; // -1 if empty
    bool dirty;
    int pinCount;
};

struct StepRecord {
    int stepNumber;
    int requestedPage;
    bool isWrite;
    std::string result; // "HIT" or "MISS"
    int frame;
    int evictedPage; // -1 if none
    int loadedPage; // -1 if hit
    int runningHits;
    int runningMisses;
    int runningFaults;
    double runningHitRatio;
    double runningFaultRate;
    std::vector<StepFrameSnapshot> frames;
};

struct SimulationConfig {
    std::string algorithm = "LRU";
    int bufferPoolSize = 3;
    int virtualPages = 10;
    int physicalFrames = 3;
    int pageSize = 4096;
    std::string workloadType = "Random";
    int totalRequests = 10;
    unsigned int seed = 42;
    int writeRatioPercent = 0;
    std::vector<int> explicitSequence;
    bool jsonMode = false;
};

struct EventItem {
    std::string time;
    std::string type;
    std::string message;
};

static std::string toUpperCopy(const std::string& algo) {
    std::string upper = algo;
    std::transform(upper.begin(), upper.end(), upper.begin(), ::toupper);
    return upper;
}

static bool isKnownAlgorithm(const std::string& algo) {
    std::string upper = toUpperCopy(algo);
    return upper == "LRU" || upper == "FIFO" || upper == "CLOCK" ||
           upper == "OPT" || upper == "OPTIMAL";
}

// Canonical display name used consistently in CLI text and JSON output.
static std::string canonicalAlgorithm(const std::string& algo) {
    std::string upper = toUpperCopy(algo);
    if (upper == "FIFO") return "FIFO";
    if (upper == "CLOCK") return "Clock";
    if (upper == "OPT" || upper == "OPTIMAL") return "OPT";
    return "LRU";
}

static std::unique_ptr<ReplacementPolicy> createPolicy(const std::string& algo) {
    std::string upper = toUpperCopy(algo);

    if (upper == "FIFO") {
        return std::make_unique<FIFO>();
    } else if (upper == "CLOCK") {
        return std::make_unique<Clock>();
    } else if (upper == "OPT" || upper == "OPTIMAL") {
        return std::make_unique<Optimal>();
    }
    return std::make_unique<LRU>();
}

static std::string escapeJson(const std::string& s) {
    std::ostringstream o;
    for (char c : s) {
        if (c == '"') o << "\\\"";
        else if (c == '\\') o << "\\\\";
        else if (c == '\b') o << "\\b";
        else if (c == '\f') o << "\\f";
        else if (c == '\n') o << "\\n";
        else if (c == '\r') o << "\\r";
        else if (c == '\t') o << "\\t";
        else o << c;
    }
    return o.str();
}

static void printUsage(const char* progName) {
    std::cerr << "Usage: " << progName << " [options]\n"
              << "Options:\n"
              << "  --json                    Enable machine-readable JSON output\n"
              << "  --algo <LRU|FIFO|Clock|OPT> Replacement policy (default: LRU)\n"
              << "  --buffer-size <N>         Number of buffer pool frames (default: 3)\n"
              << "  --virtual-pages <N>       Number of virtual memory pages (default: 10)\n"
              << "  --physical-frames <N>     Number of physical frames (default: 3)\n"
              << "  --page-size <N>           Page size in bytes (default: 4096)\n"
              << "  --workload <type>         Workload type (Sequential, Random, HighLocality, Mixed, Repeating)\n"
              << "  --requests <N>            Number of page requests (default: 10)\n"
              << "  --seed <N>                Random seed for workload generation (default: 42)\n"
              << "  --write-ratio <N>         Percentage of requests that are writes, 0-100 (default: 0)\n"
              << "  --sequence <p1,p2,...>    Explicit comma-separated reference string\n"
              << "  --help, -h                Show this help message\n";
}

int main(int argc, char* argv[]) {
    SimulationConfig config;
    bool hasArgs = (argc > 1);
    bool algoProvided = false;

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];

        if (arg == "--json") {
            config.jsonMode = true;
        } else if (arg == "--algo" && i + 1 < argc) {
            config.algorithm = argv[++i];
            algoProvided = true;
        } else if ((arg == "--buffer-size" || arg == "--frames") && i + 1 < argc) {
            config.bufferPoolSize = std::max(1, std::stoi(argv[++i]));
        } else if ((arg == "--virtual-pages" || arg == "--pages") && i + 1 < argc) {
            config.virtualPages = std::max(1, std::stoi(argv[++i]));
        } else if (arg == "--physical-frames" && i + 1 < argc) {
            config.physicalFrames = std::max(1, std::stoi(argv[++i]));
        } else if (arg == "--page-size" && i + 1 < argc) {
            config.pageSize = std::max(256, std::stoi(argv[++i]));
        } else if (arg == "--workload" && i + 1 < argc) {
            config.workloadType = argv[++i];
        } else if (arg == "--requests" && i + 1 < argc) {
            config.totalRequests = std::max(1, std::stoi(argv[++i]));
        } else if (arg == "--seed" && i + 1 < argc) {
            config.seed = static_cast<unsigned int>(std::stoul(argv[++i]));
        } else if (arg == "--write-ratio" && i + 1 < argc) {
            config.writeRatioPercent = std::stoi(argv[++i]);
        } else if (arg == "--sequence" && i + 1 < argc) {
            std::string seqStr = argv[++i];
            std::stringstream ss(seqStr);
            std::string item;
            config.explicitSequence.clear();
            while (std::getline(ss, item, ',')) {
                if (!item.empty()) {
                    try {
                        config.explicitSequence.push_back(std::stoi(item));
                    } catch (...) {
                        std::cerr << "Error: invalid page reference '" << item
                                  << "' in --sequence (must be a comma-separated list of integers).\n";
                        return 1;
                    }
                }
            }
        } else if (arg == "--help" || arg == "-h") {
            printUsage(argv[0]);
            return 0;
        } else {
            std::cerr << "Error: Unknown option '" << arg << "'\n"
                      << "Run with --help to see valid options.\n";
            return 1;
        }
    }

    // Validate and canonicalize the requested algorithm
    if (algoProvided && !isKnownAlgorithm(config.algorithm)) {
        std::cerr << "Error: Unsupported algorithm '" << config.algorithm << "'.\n"
                  << "Valid algorithms: LRU, FIFO, Clock, OPT.\n";
        return 1;
    }
    config.algorithm = canonicalAlgorithm(config.algorithm);

    if (config.writeRatioPercent < 0 || config.writeRatioPercent > 100) {
        std::cerr << "Error: --write-ratio must be between 0 and 100 (got "
                  << config.writeRatioPercent << ").\n";
        return 1;
    }

    // Determine requests sequence
    std::vector<int> requests;
    if (!config.explicitSequence.empty()) {
        requests = config.explicitSequence;
        config.totalRequests = static_cast<int>(requests.size());
    } else if (hasArgs) {
        if (!WorkloadGenerator::isKnownType(config.workloadType)) {
            std::cerr << "Error: Unknown workload type '" << config.workloadType << "'.\n"
                      << "Valid types: Sequential, Random, HighLocality, Mixed, Repeating.\n";
            return 1;
        }
        WorkloadType wtype = WorkloadGenerator::parseType(config.workloadType);
        config.workloadType = WorkloadGenerator::typeToString(wtype);
        requests = WorkloadGenerator::generate(wtype, config.totalRequests, config.virtualPages, config.seed);
    } else {
        // Default demo sequence
        requests = { 1, 2, 3, 1, 4, 2, 5, 1 };
        config.totalRequests = static_cast<int>(requests.size());
    }

    auto startTime = std::chrono::high_resolution_clock::now();

    // Deterministic read/write assignment for the whole run.
    std::vector<bool> writeMask =
        WorkloadGenerator::writeMask(config.totalRequests, config.writeRatioPercent, config.seed);

    MetricsCollector bufferMetrics;
    BufferPoolManager bufferPool(
        config.bufferPoolSize,
        createPolicy(config.algorithm),
        &bufferMetrics
    );

    MetricsCollector vmMetrics;
    VirtualMemoryManager vm(
        config.virtualPages,
        config.physicalFrames,
        createPolicy(config.algorithm),
        &vmMetrics
    );

    // Give lookahead policies (e.g. OPT) the full reference sequence up front.
    bufferPool.setReferenceSequence(requests);
    vm.setReferenceSequence(requests);

    std::vector<EventItem> events;
    events.reserve(requests.size() * 3);

    std::vector<StepRecord> stepRecords;
    stepRecords.reserve(requests.size());

    int runningHits = 0;
    int runningMisses = 0;

    for (size_t step = 0; step < requests.size(); ++step) {
        int page = requests[step];
        bool isWrite = step < writeMask.size() ? writeMask[step] : false;
        std::ostringstream timeStr;
        timeStr << "Step " << (step + 1);

        // Snapshot frames before access to know what was in the frame before eviction
        std::vector<BufferFrame> beforeFrames = bufferPool.getFrames();
        bool wasInBuffer = false;
        int hitFrame = -1;
        for (const auto& frame : beforeFrames) {
            if (frame.isValid() && frame.getPageId() == page) {
                wasInBuffer = true;
                hitFrame = frame.getFrameId();
                break;
            }
        }

        // Buffer Pool access
        int oldEvictions = bufferPool.getEvictions();
        int bufDirtyBefore = bufferMetrics.getDirtyEvictions();
        int bpFrame = bufferPool.accessPage(page, isWrite);

        int evictedPage = -1;
        int loadedPage = -1;

        if (wasInBuffer) {
            runningHits++;
            events.push_back({
                timeStr.str(),
                "BUFFER_HIT",
                "Page " + std::to_string(page) + " \xe2\x86\x92 Buffer Hit"
            });
        } else {
            runningMisses++;
            loadedPage = page;
            events.push_back({
                timeStr.str(),
                "BUFFER_MISS",
                "Page " + std::to_string(page) + " \xe2\x86\x92 Buffer Miss"
            });

            if (bufferPool.getEvictions() > oldEvictions && bpFrame >= 0 && bpFrame < static_cast<int>(beforeFrames.size())) {
                evictedPage = beforeFrames[bpFrame].getPageId();
                events.push_back({
                    timeStr.str(),
                    "PAGE_EVICT",
                    config.algorithm + " \xe2\x86\x92 Evict Frame " + std::to_string(bpFrame) + " (Page " + std::to_string(evictedPage) + ")"
                });
            }

            if (bpFrame != -1) {
                events.push_back({
                    timeStr.str(),
                    "PAGE_FETCH",
                    "Page " + std::to_string(page) + " \xe2\x86\x92 Loaded into Buffer Frame " + std::to_string(bpFrame)
                });
            }
        }

        // Virtual Memory access
        bool wasInVm = vm.getPageTable().isPresent(page);
        int vmDirtyBefore = vmMetrics.getDirtyEvictions();
        int vmFrame = vm.accessPage(page, isWrite);

        if (!wasInVm) {
            events.push_back({
                timeStr.str(),
                "PAGE_FAULT",
                "Virtual Page " + std::to_string(page) + " \xe2\x86\x92 Page Fault"
            });

            if (vmFrame != -1) {
                events.push_back({
                    timeStr.str(),
                    "PAGE_LOAD",
                    "Virtual Page " + std::to_string(page) + " \xe2\x86\x92 Physical Frame " + std::to_string(vmFrame)
                });
            }
        }

        // Dirty-page write-back events (disk writes happen only on eviction)
        if (bufferMetrics.getDirtyEvictions() > bufDirtyBefore) {
            events.push_back({
                timeStr.str(),
                "DISK_WRITE",
                "Buffer Pool \xe2\x86\x92 Dirty page evicted, written back to disk"
            });
        }
        if (vmMetrics.getDirtyEvictions() > vmDirtyBefore) {
            events.push_back({
                timeStr.str(),
                "DISK_WRITE",
                "Virtual Memory \xe2\x86\x92 Dirty page evicted, written back to disk"
            });
        }

        // Capture after-frames snapshot for this step
        const auto& afterFrames = bufferPool.getFrames();
        std::vector<StepFrameSnapshot> frameSnapshots;
        frameSnapshots.reserve(afterFrames.size());
        for (const auto& f : afterFrames) {
            frameSnapshots.push_back({
                f.getFrameId(),
                f.isValid() ? f.getPageId() : -1,
                f.isDirty(),
                f.getPinCount()
            });
        }

        int curTotal = static_cast<int>(step + 1);
        double curHitRatio = (static_cast<double>(runningHits) / curTotal) * 100.0;
        double curFaultRate = (static_cast<double>(vmMetrics.getPageFaults()) / curTotal) * 100.0;

        stepRecords.push_back({
            static_cast<int>(step + 1),
            page,
            isWrite,
            wasInBuffer ? "HIT" : "MISS",
            wasInBuffer ? hitFrame : bpFrame,
            evictedPage,
            loadedPage,
            runningHits,
            runningMisses,
            vmMetrics.getPageFaults(),
            curHitRatio,
            curFaultRate,
            frameSnapshots
        });
    }

    auto endTime = std::chrono::high_resolution_clock::now();
    double executionTimeMs = std::chrono::duration<double, std::milli>(endTime - startTime).count();

    if (config.jsonMode) {
        std::cout << "{\n";
        std::cout << "  \"config\": {\n"
                  << "    \"algorithm\": \"" << escapeJson(config.algorithm) << "\",\n"
                  << "    \"bufferPoolSize\": " << config.bufferPoolSize << ",\n"
                  << "    \"virtualPages\": " << config.virtualPages << ",\n"
                  << "    \"physicalFrames\": " << config.physicalFrames << ",\n"
                  << "    \"pageSize\": " << config.pageSize << ",\n"
                  << "    \"workloadType\": \"" << escapeJson(config.workloadType) << "\",\n"
                  << "    \"totalRequests\": " << config.totalRequests << ",\n"
                  << "    \"seed\": " << config.seed << ",\n"
                  << "    \"writeRatio\": " << config.writeRatioPercent << "\n"
                  << "  },\n";

        // Reference sequence
        std::cout << "  \"sequence\": [";
        for (size_t i = 0; i < requests.size(); ++i) {
            std::cout << requests[i] << (i + 1 < requests.size() ? ", " : "");
        }
        std::cout << "],\n";

        // Buffer Pool Frames (final state)
        std::cout << "  \"bufferPool\": [\n";
        const auto& frames = bufferPool.getFrames();
        for (size_t i = 0; i < frames.size(); ++i) {
            const auto& f = frames[i];
            std::cout << "    {\n"
                      << "      \"frameId\": " << f.getFrameId() << ",\n"
                      << "      \"pageId\": " << (f.isValid() ? std::to_string(f.getPageId()) : "null") << ",\n"
                      << "      \"dirty\": " << (f.isDirty() ? "true" : "false") << ",\n"
                      << "      \"pinCount\": " << f.getPinCount() << "\n"
                      << "    }" << (i + 1 < frames.size() ? "," : "") << "\n";
        }
        std::cout << "  ],\n";

        // Virtual Memory / Page Table (final state)
        std::cout << "  \"virtualMemory\": [\n";
        const auto& pt = vm.getPageTable();
        for (int p = 0; p < config.virtualPages; ++p) {
            bool present = pt.isPresent(p);
            int frame = pt.getFrame(p);
            bool dirty = pt.isDirty(p);
            std::cout << "    {\n"
                      << "      \"virtualPage\": " << p << ",\n"
                      << "      \"physicalFrame\": " << (present ? std::to_string(frame) : "null") << ",\n"
                      << "      \"present\": " << (present ? "true" : "false") << ",\n"
                      << "      \"dirty\": " << (dirty ? "true" : "false") << "\n"
                      << "    }" << (p + 1 < config.virtualPages ? "," : "") << "\n";
        }
        std::cout << "  ],\n";

        // Layer-separated metrics: buffer pool and virtual memory are
        // independent layers; their counters are never summed into the
        // layer-specific fields. The legacy combined fields are kept for
        // backward compatibility with existing consumers.
        int totalReq = config.totalRequests;
        int bufferRequests = bufferMetrics.getTotalRequests();
        int bufHits = bufferMetrics.getBufferHits();
        int bufMisses = bufferMetrics.getBufferMisses();
        int vmRequests = vmMetrics.getTotalRequests();
        int vmHits = vmMetrics.getBufferHits();
        int pageFaults = vmMetrics.getPageFaults();

        auto pct = [](int numerator, int denominator) {
            if (denominator <= 0) {
                return 0.0;
            }
            return (static_cast<double>(numerator) / static_cast<double>(denominator)) * 100.0;
        };

        std::cout << "  \"metrics\": {\n"
                  << "    \"totalRequests\": " << totalReq << ",\n"
                  << "    \"bufferRequests\": " << bufferRequests << ",\n"
                  << "    \"bufferHits\": " << bufHits << ",\n"
                  << "    \"bufferMisses\": " << bufMisses << ",\n"
                  << std::fixed << std::setprecision(2)
                  << "    \"bufferHitRatio\": " << pct(bufHits, bufferRequests) << ",\n"
                  << "    \"bufferMissRatio\": " << pct(bufMisses, bufferRequests) << ",\n"
                  << "    \"bufferDiskReads\": " << bufferMetrics.getDiskReads() << ",\n"
                  << "    \"bufferDiskWrites\": " << bufferMetrics.getDiskWrites() << ",\n"
                  << "    \"bufferEvictions\": " << bufferPool.getEvictions() << ",\n"
                  << "    \"bufferDirtyEvictions\": " << bufferMetrics.getDirtyEvictions() << ",\n"
                  << "    \"vmRequests\": " << vmRequests << ",\n"
                  << "    \"vmHits\": " << vmHits << ",\n"
                  << "    \"vmHitRatio\": " << pct(vmHits, vmRequests) << ",\n"
                  << "    \"pageFaults\": " << pageFaults << ",\n"
                  << "    \"pageFaultRate\": " << pct(pageFaults, vmRequests) << ",\n"
                  << "    \"vmDiskReads\": " << vmMetrics.getDiskReads() << ",\n"
                  << "    \"vmDiskWrites\": " << vmMetrics.getDiskWrites() << ",\n"
                  << "    \"vmEvictions\": " << vmMetrics.getEvictions() << ",\n"
                  << "    \"vmDirtyEvictions\": " << vmMetrics.getDirtyEvictions() << ",\n"
                  << "    \"writeRatio\": " << config.writeRatioPercent << ",\n"
                  << "    \"diskReads\": " << (bufMisses + pageFaults) << ",\n"
                  << "    \"diskWrites\": " << (bufferMetrics.getDiskWrites() + vmMetrics.getDiskWrites()) << ",\n"
                  << "    \"evictions\": " << (bufferPool.getEvictions() + vmMetrics.getEvictions()) << ",\n"
                  << "    \"dirtyEvictions\": " << (bufferMetrics.getDirtyEvictions() + vmMetrics.getDirtyEvictions()) << ",\n"
                  << "    \"executionTimeMs\": " << executionTimeMs << "\n"
                  << "  },\n";

        // Per-step execution details. Step/event JSON capture is bounded so a
        // long run cannot produce unbounded output; metrics always reflect the
        // complete run.
        const size_t kMaxJsonSteps = 1000;
        const size_t kMaxJsonEvents = 5000;
        const size_t stepsEmitted = std::min(stepRecords.size(), kMaxJsonSteps);
        const size_t eventsEmitted = std::min(events.size(), kMaxJsonEvents);

        std::cout << "  \"totalSteps\": " << stepRecords.size() << ",\n"
                  << "  \"stepsEmitted\": " << stepsEmitted << ",\n"
                  << "  \"stepsTruncated\": " << (stepRecords.size() > kMaxJsonSteps ? "true" : "false") << ",\n"
                  << "  \"totalEvents\": " << events.size() << ",\n"
                  << "  \"eventsEmitted\": " << eventsEmitted << ",\n"
                  << "  \"eventsTruncated\": " << (events.size() > kMaxJsonEvents ? "true" : "false") << ",\n";

        std::cout << "  \"steps\": [\n";
        for (size_t s = 0; s < stepsEmitted; ++s) {
            const auto& st = stepRecords[s];
            std::cout << "    {\n"
                      << "      \"step\": " << st.stepNumber << ",\n"
                      << "      \"requestedPage\": " << st.requestedPage << ",\n"
                      << "      \"isWrite\": " << (st.isWrite ? "true" : "false") << ",\n"
                      << "      \"result\": \"" << st.result << "\",\n"
                      << "      \"frame\": " << st.frame << ",\n"
                      << "      \"evictedPage\": " << (st.evictedPage >= 0 ? std::to_string(st.evictedPage) : "null") << ",\n"
                      << "      \"loadedPage\": " << (st.loadedPage >= 0 ? std::to_string(st.loadedPage) : "null") << ",\n"
                      << "      \"runningHits\": " << st.runningHits << ",\n"
                      << "      \"runningMisses\": " << st.runningMisses << ",\n"
                      << "      \"runningFaults\": " << st.runningFaults << ",\n"
                      << std::fixed << std::setprecision(2)
                      << "      \"runningHitRatio\": " << st.runningHitRatio << ",\n"
                      << "      \"runningFaultRate\": " << st.runningFaultRate << ",\n"
                      << "      \"frames\": [\n";
            for (size_t f = 0; f < st.frames.size(); ++f) {
                const auto& fr = st.frames[f];
                std::cout << "        {\n"
                          << "          \"frameId\": " << fr.frameId << ",\n"
                          << "          \"pageId\": " << (fr.pageId >= 0 ? std::to_string(fr.pageId) : "null") << ",\n"
                          << "          \"dirty\": " << (fr.dirty ? "true" : "false") << ",\n"
                          << "          \"pinCount\": " << fr.pinCount << "\n"
                          << "        }" << (f + 1 < st.frames.size() ? "," : "") << "\n";
            }
            std::cout << "      ]\n"
                      << "    }" << (s + 1 < stepsEmitted ? "," : "") << "\n";
        }
        std::cout << "  ],\n";

        // Events
        std::cout << "  \"events\": [\n";
        for (size_t i = 0; i < eventsEmitted; ++i) {
            std::cout << "    {\n"
                      << "      \"time\": \"" << escapeJson(events[i].time) << "\",\n"
                      << "      \"type\": \"" << escapeJson(events[i].type) << "\",\n"
                      << "      \"message\": \"" << escapeJson(events[i].message) << "\"\n"
                      << "    }" << (i + 1 < eventsEmitted ? "," : "") << "\n";
        }
        std::cout << "  ]\n";
        std::cout << "}\n";
    } else {
        std::cout << "\n==============================\n"
                  << config.algorithm << " SIMULATION (" << config.workloadType << ")\n"
                  << "==============================\n";

        std::cout << "Requests: ";
        for (int p : requests) std::cout << p << " ";
        std::cout << "\n\n";

        std::cout << "Buffer Pool Frames: " << config.bufferPoolSize << "\n";
        std::cout << "Write Ratio: " << config.writeRatioPercent << "%\n";
        std::cout << "Buffer Hits: " << bufferMetrics.getBufferHits() << "\n";
        std::cout << "Buffer Misses: " << bufferMetrics.getBufferMisses() << "\n";
        std::cout << "Buffer Evictions: " << bufferPool.getEvictions() << "\n";
        std::cout << "Buffer Hit Ratio: " << std::fixed << std::setprecision(2)
                  << (bufferMetrics.getBufferHitRatio() * 100.0) << "%\n";

        std::cout << "\nVirtual Memory Page Faults: " << vm.getPageFaults() << "\n";
        std::cout << "Page Fault Rate: "
                  << (vmMetrics.getPageFaultRate() * 100.0) << "%\n";
        std::cout << "Execution Time: " << executionTimeMs << " ms\n";
    }

    return 0;
}