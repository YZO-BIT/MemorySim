#pragma once

#include "BufferFrame.hpp"
#include "replacement/ReplacementPolicy.hpp"

#include <memory>
#include <unordered_map>
#include <vector>

class BufferPoolManager {
private:
    std::vector<BufferFrame> frames;

    std::unordered_map<int, int> pageTable;

    std::unique_ptr<ReplacementPolicy> replacementPolicy;

    int hits;
    int misses;
    int evictions;

public:
    BufferPoolManager(
        int poolSize,
        std::unique_ptr<ReplacementPolicy> policy
    );

    int fetchPage(int pageId);

    void unpinPage(int pageId);

    void markDirty(int pageId);

    int getHits() const;

    int getMisses() const;

    int getEvictions() const;

    const std::vector<BufferFrame>& getFrames() const;
};