#pragma once

#include "ReplacementPolicy.hpp"

#include <queue>
#include <unordered_set>

class FIFO : public ReplacementPolicy {
private:
    std::queue<int> order;
    std::unordered_set<int> present;

public:
    void access(int frameId) override;

    void insert(int frameId) override;

    void remove(int frameId) override;

    int evict() override;
};