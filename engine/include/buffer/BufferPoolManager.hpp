#pragma once

#include "BufferFrame.hpp"
#include "replacement/ReplacementPolicy.hpp"
#include "metrics/MetricsCollector.hpp"

#include <memory>
#include <unordered_map>
#include <vector>

class BufferPoolManager {
private:
    std::vector<BufferFrame> frames;

    std::unordered_map<int, int> pageTable;

    std::unique_ptr<ReplacementPolicy> replacementPolicy;
    MetricsCollector* metrics;

    int hits;
    int misses;
    int evictions;

public:
    BufferPoolManager(
        int poolSize,
        std::unique_ptr<ReplacementPolicy> policy,
        MetricsCollector* metrics = nullptr
    );

    int fetchPage(int pageId);

    bool unpinPage(int pageId, bool isDirty = false);

    int accessPage(int pageId, bool isWrite = false);

    void markDirty(int pageId);

    bool flushPage(int pageId);

    void flushAllPages();

    int getHits() const;

    int getMisses() const;

    int getEvictions() const;

    int getPoolSize() const;

    const std::vector<BufferFrame>& getFrames() const;

    void setMetricsCollector(MetricsCollector* m);
};