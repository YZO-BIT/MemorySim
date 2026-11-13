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
#include "metrics/MetricsCollector.hpp"
#include "workload/WorkloadGenerator.hpp"

struct StepFrameSnapshot {
    int frameId;
    int pageId; 
    bool dirty;
    int pinCount;
};

struct StepRecord {
    int stepNumber;
    int requestedPage;
    std::string result;
    int frame;
    int evictedPage;
    int loadedPage; 
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
    std::vector<int> explicitSequence;
    bool jsonMode = false;
};

struct EventItem {
    std::string time;
    std::string type;
    std::string message;
};

static std::unique_ptr<ReplacementPolicy> createPolicy(const std::string& algo) {
    std::string upper = algo;
    std::transform(upper.begin(), upper.end(), upper.begin(), ::toupper);

    if (upper == "FIFO") {
        return std::make_unique<FIFO>();
    } else if (upper == "CLOCK") {
        return std::make_unique<Clock>();
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
              << "  --algo <LRU|FIFO|Clock>   Replacement policy (default: LRU)\n"
              << "  --buffer-size <N>         Number of buffer pool frames (default: 3)\n"
              << "  --virtual-pages <N>       Number of virtual memory pages (default: 10)\n"
              << "  --physical-frames <N>     Number of physical frames (default: 3)\n"
              << "  --page-size <N>           Page size in bytes (default: 4096)\n"
              << "  --workload <type>         Workload type (Sequential, Random, HighLocality, Mixed)\n"
              << "  --requests <N>            Number of page requests (default: 10)\n"
              << "  --seed <N>                Random seed for workload generation (default: 42)\n"
              << "  --sequence <p1,p2,...>    Explicit comma-separated reference string\n"
              << "  --help, -h                Show this help message\n";
}

int main(int argc, char* argv[]) {
    SimulationConfig config;
    bool hasArgs = (argc > 1);

    for (int i = 1; i < argc; ++i) {
        std::string arg = argv[i];

        if (arg == "--json") {
            config.jsonMode = true;
        } else if (arg == "--algo" && i + 1 < argc) {
            config.algorithm = argv[++i];
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
        } else if (arg == "--sequence" && i + 1 < argc) {
            std::string seqStr = argv[++i];
            std::stringstream ss(seqStr);
            std::string item;
            config.explicitSequence.clear();
            while (std::getline(ss, item, ',')) {
                if (!item.empty()) {
                    try {
                        config.explicitSequence.push_back(std::stoi(item));
                    } catch (...) {}
                }
            }
        } else if (arg == "--help" || arg == "-h") {
            printUsage(argv[0]);
            return 0;
        } else {
            std::cerr << "Warning: Unknown option '" << arg << "'\n";
        }
    }

    std::vector<int> requests;
    if (!config.explicitSequence.empty()) {
        requests = config.explicitSequence;
        config.totalRequests = static_cast<int>(requests.size());
    } else if (hasArgs) {
        WorkloadType wtype = WorkloadGenerator::parseType(config.workloadType);
        config.workloadType = WorkloadGenerator::typeToString(wtype);
        requests = WorkloadGenerator::generate(wtype, config.totalRequests, config.virtualPages, config.seed);
    } else {
        requests = { 1, 2, 3, 1, 4, 2, 5, 1 };
        config.totalRequests = static_cast<int>(requests.size());
    }

    auto startTime = std::chrono::high_resolution_clock::now();

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

    std::vector<EventItem> events;
    events.reserve(requests.size() * 3);

    std::vector<StepRecord> stepRecords;
    stepRecords.reserve(requests.size());

    int runningHits = 0;
    int runningMisses = 0;

    for (size_t step = 0; step < requests.size(); ++step) {
        int page = requests[step];
        std::ostringstream timeStr;
        timeStr << "Step " << (step + 1);

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

        int oldEvictions = bufferPool.getEvictions();
        int bpFrame = bufferPool.accessPage(page, false);

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

        bool wasInVm = vm.getPageTable().isPresent(page);
        int vmFrame = vm.accessPage(page, false);

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
                  << "    \"totalRequests\": " << config.totalRequests << "\n"
                  << "  },\n";

        std::cout << "  \"sequence\": [";
        for (size_t i = 0; i < requests.size(); ++i) {
            std::cout << requests[i] << (i + 1 < requests.size() ? ", " : "");
        }
        std::cout << "],\n";

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

        int totalReq = config.totalRequests;
        int bufHits = bufferMetrics.getBufferHits();
        int bufMisses = bufferMetrics.getBufferMisses();
        double hitRatio = totalReq > 0 ? (static_cast<double>(bufHits) / totalReq) * 100.0 : 0.0;
        int pageFaults = vmMetrics.getPageFaults();
        double faultRate = totalReq > 0 ? (static_cast<double>(pageFaults) / totalReq) * 100.0 : 0.0;

        std::cout << "  \"metrics\": {\n"
                  << "    \"totalRequests\": " << totalReq << ",\n"
                  << "    \"bufferHits\": " << bufHits << ",\n"
                  << "    \"bufferMisses\": " << bufMisses << ",\n"
                  << std::fixed << std::setprecision(2)
                  << "    \"bufferHitRatio\": " << hitRatio << ",\n"
                  << "    \"pageFaults\": " << pageFaults << ",\n"
                  << "    \"pageFaultRate\": " << faultRate << ",\n"
                  << "    \"diskReads\": " << (bufMisses + pageFaults) << ",\n"
                  << "    \"diskWrites\": " << (bufferMetrics.getDiskWrites() + vmMetrics.getDiskWrites()) << ",\n"
                  << "    \"evictions\": " << (bufferPool.getEvictions() + vmMetrics.getEvictions()) << ",\n"
                  << "    \"dirtyEvictions\": " << (bufferMetrics.getDirtyEvictions() + vmMetrics.getDirtyEvictions()) << ",\n"
                  << "    \"executionTimeMs\": " << executionTimeMs << "\n"
                  << "  },\n";

        std::cout << "  \"steps\": [\n";
        for (size_t s = 0; s < stepRecords.size(); ++s) {
            const auto& st = stepRecords[s];
            std::cout << "    {\n"
                      << "      \"step\": " << st.stepNumber << ",\n"
                      << "      \"requestedPage\": " << st.requestedPage << ",\n"
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
                      << "    }" << (s + 1 < stepRecords.size() ? "," : "") << "\n";
        }
        std::cout << "  ],\n";

        std::cout << "  \"events\": [\n";
        for (size_t i = 0; i < events.size(); ++i) {
            std::cout << "    {\n"
                      << "      \"time\": \"" << escapeJson(events[i].time) << "\",\n"
                      << "      \"type\": \"" << escapeJson(events[i].type) << "\",\n"
                      << "      \"message\": \"" << escapeJson(events[i].message) << "\"\n"
                      << "    }" << (i + 1 < events.size() ? "," : "") << "\n";
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