#include "workload/WorkloadGenerator.hpp"

#include <algorithm>
#include <cctype>
#include <cstdint>

namespace {

// Mulberry32 PRNG. Bit-exact port of the backend implementation in
// server/src/services/workload.service.js. Both layers therefore produce
// identical sequences for identical seeds.
class Mulberry32 {
public:
    explicit Mulberry32(unsigned int seed) : state(seed) {}

    // Returns a double in [0, 1), matching the JS implementation.
    double next() {
        state += 0x6D2B79F5u;
        std::uint32_t t = state ^ (state >> 15);
        t *= (1u | state);
        t = (t + ((t ^ (t >> 7)) * (61u | t))) ^ t;
        return static_cast<double>(t ^ (t >> 14)) / 4294967296.0;
    }

private:
    std::uint32_t state;
};

int floorPage(Mulberry32& rng, int count) {
    return static_cast<int>(rng.next() * static_cast<double>(count));
}

} // namespace

WorkloadType WorkloadGenerator::parseType(const std::string& typeStr) {
    std::string lower;
    lower.reserve(typeStr.size());
    for (char c : typeStr) {
        if (c != ' ' && c != '_' && c != '-') {
            lower.push_back(static_cast<char>(std::tolower(c)));
        }
    }

    if (lower == "sequential") {
        return WorkloadType::Sequential;
    }
    if (lower == "random") {
        return WorkloadType::Random;
    }
    if (lower == "highlocality" || lower == "locality") {
        return WorkloadType::HighLocality;
    }
    if (lower == "mixed") {
        return WorkloadType::Mixed;
    }
    if (lower == "repeating" || lower == "repeat" || lower == "loop" ||
        lower == "repeatingpattern") {
        return WorkloadType::Repeating;
    }

    return WorkloadType::Random;
}

bool WorkloadGenerator::isKnownType(const std::string& typeStr) {
    std::string lower;
    lower.reserve(typeStr.size());
    for (char c : typeStr) {
        if (c != ' ' && c != '_' && c != '-') {
            lower.push_back(static_cast<char>(std::tolower(c)));
        }
    }

    return lower == "sequential" || lower == "random" ||
           lower == "highlocality" || lower == "locality" ||
           lower == "mixed" ||
           lower == "repeating" || lower == "repeat" || lower == "loop" ||
           lower == "repeatingpattern";
}

std::string WorkloadGenerator::typeToString(WorkloadType type) {
    switch (type) {
        case WorkloadType::Sequential:
            return "Sequential";
        case WorkloadType::Random:
            return "Random";
        case WorkloadType::HighLocality:
            return "High Locality";
        case WorkloadType::Mixed:
            return "Mixed";
        case WorkloadType::Repeating:
            return "Repeating";
    }
    return "Random";
}

std::vector<int> WorkloadGenerator::generate(
    WorkloadType type,
    int totalRequests,
    int pageCount,
    unsigned int seed
) {
    if (totalRequests <= 0 || pageCount <= 0) {
        return {};
    }

    std::vector<int> requests;
    requests.reserve(totalRequests);

    Mulberry32 rng(seed);

    if (type == WorkloadType::Sequential) {
        for (int i = 0; i < totalRequests; i++) {
            requests.push_back(i % pageCount);
        }
    } else if (type == WorkloadType::Repeating) {
        int cycleLen = std::max(1, std::min(pageCount, 4));
        for (int i = 0; i < totalRequests; i++) {
            requests.push_back(i % cycleLen);
        }
    } else if (type == WorkloadType::Random) {
        for (int i = 0; i < totalRequests; i++) {
            requests.push_back(floorPage(rng, pageCount));
        }
    } else if (type == WorkloadType::HighLocality) {
        // 80/20 rule: 80% of accesses target 20% of the pages (hot set)
        int hotCount = std::max(1, static_cast<int>(pageCount * 0.20));

        for (int i = 0; i < totalRequests; i++) {
            if (rng.next() < 0.80 || hotCount >= pageCount) {
                requests.push_back(floorPage(rng, hotCount));
            } else {
                requests.push_back(hotCount + floorPage(rng, pageCount - hotCount));
            }
        }
    } else if (type == WorkloadType::Mixed) {
        // 50% High Locality, 30% Sequential bursts, 20% Uniform Random
        int hotCount = std::max(1, static_cast<int>(pageCount * 0.20));
        int seqCounter = 0;

        for (int i = 0; i < totalRequests; i++) {
            double r = rng.next();
            if (r < 0.50) {
                // High locality
                requests.push_back(floorPage(rng, hotCount));
            } else if (r < 0.80) {
                // Sequential stride
                requests.push_back(seqCounter % pageCount);
                seqCounter++;
            } else {
                // Random noise
                requests.push_back(floorPage(rng, pageCount));
            }
        }
    }

    return requests;
}

std::vector<bool> WorkloadGenerator::writeMask(
    int totalRequests,
    int writeRatioPercent,
    unsigned int seed
) {
    std::vector<bool> mask;
    if (totalRequests <= 0) {
        return mask;
    }

    mask.assign(static_cast<std::size_t>(totalRequests), false);

    if (writeRatioPercent >= 100) {
        mask.assign(mask.size(), true);
        return mask;
    }
    if (writeRatioPercent <= 0) {
        return mask;
    }

    const double threshold = static_cast<double>(writeRatioPercent) / 100.0;
    Mulberry32 rng(seed);
    for (int i = 0; i < totalRequests; i++) {
        mask[i] = rng.next() < threshold;
    }
    return mask;
}
