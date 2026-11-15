#pragma once

#include <string>
#include <vector>

enum class WorkloadType {
    Sequential,
    Random,
    HighLocality,
    Mixed,
    Repeating
};

class WorkloadGenerator {
public:
    static WorkloadType parseType(const std::string& typeStr);

    // True when the string is a recognized workload name (case-insensitive,
    // ignoring spaces/underscores/hyphens). parseType() falls back to Random
    // for unrecognized strings; callers that must reject unknown names
    // should consult this first.
    static bool isKnownType(const std::string& typeStr);

    static std::string typeToString(WorkloadType type);

    // Canonical workload generation. The implementation is a fixed
    // (Mulberry32) integer RNG so that identical seeds and configurations
    // produce identical sequences on every platform and in every layer
    // (engine and backend service share this exact algorithm).
    static std::vector<int> generate(
        WorkloadType type,
        int totalRequests,
        int pageCount,
        unsigned int seed = 42
    );

    // Deterministic read/write assignment. Request i is a write iff the
    // seeded Mulberry32 stream yields a value < writeRatioPercent / 100.0.
    // The stream is independent of workload generation.
    static std::vector<bool> writeMask(
        int totalRequests,
        int writeRatioPercent,
        unsigned int seed = 42
    );
};
