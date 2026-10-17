#include "workload/WorkloadGenerator.hpp"
#include <algorithm>
#include <cctype>

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

    return WorkloadType::Random;
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

    std::mt19937 rng(seed);

    if (type == WorkloadType::Sequential) {
        for (int i = 0; i < totalRequests; i++) {
            requests.push_back(i % pageCount);
        }
    } else if (type == WorkloadType::Random) {
        std::uniform_int_distribution<int> dist(0, pageCount - 1);
        for (int i = 0; i < totalRequests; i++) {
            requests.push_back(dist(rng));
        }
    } else if (type == WorkloadType::HighLocality) {
        // 80/20 rule: 80% of accesses target 20% of the pages (hot set)
        int hotCount = std::max(1, static_cast<int>(pageCount * 0.20));
        std::uniform_real_distribution<double> coin(0.0, 1.0);
        std::uniform_int_distribution<int> hotDist(0, hotCount - 1);
        std::uniform_int_distribution<int> coldDist(hotCount, pageCount - 1);

        for (int i = 0; i < totalRequests; i++) {
            if (coin(rng) < 0.80 || hotCount >= pageCount) {
                requests.push_back(hotDist(rng));
            } else {
                requests.push_back(coldDist(rng));
            }
        }
    } else if (type == WorkloadType::Mixed) {
        // 50% High Locality, 30% Sequential bursts, 20% Uniform Random
        int hotCount = std::max(1, static_cast<int>(pageCount * 0.20));
        std::uniform_real_distribution<double> coin(0.0, 1.0);
        std::uniform_int_distribution<int> hotDist(0, hotCount - 1);
        std::uniform_int_distribution<int> randDist(0, pageCount - 1);
        int seqCounter = 0;

        for (int i = 0; i < totalRequests; i++) {
            double r = coin(rng);
            if (r < 0.50) {
                // High locality
                requests.push_back(hotDist(rng));
            } else if (r < 0.80) {
                // Sequential stride
                requests.push_back(seqCounter % pageCount);
                seqCounter++;
            } else {
                // Random noise
                requests.push_back(randDist(rng));
            }
        }
    }

    return requests;
}
