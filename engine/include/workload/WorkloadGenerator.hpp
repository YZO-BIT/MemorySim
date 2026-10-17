#pragma once

#include <string>
#include <vector>
#include <random>
#include <stdexcept>

enum class WorkloadType {
    Sequential,
    Random,
    HighLocality,
    Mixed
};

class WorkloadGenerator {
public:
    static WorkloadType parseType(const std::string& typeStr);
    static std::string typeToString(WorkloadType type);

    static std::vector<int> generate(
        WorkloadType type,
        int totalRequests,
        int pageCount,
        unsigned int seed = 42
    );
};
