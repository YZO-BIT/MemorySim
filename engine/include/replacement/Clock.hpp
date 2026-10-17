#pragma once

#include "ReplacementPolicy.hpp"

#include <unordered_map>
#include <vector>

class Clock : public ReplacementPolicy {
private:
    std::vector<int> frames;

    std::unordered_map<int, bool> referenceBit;

    int hand;

public:
    Clock();

    void access(int frameId) override;

    void insert(int frameId) override;

    void remove(int frameId) override;

    int evict(const std::function<bool(int)>& isEligible) override;

    int evict() override {
        return evict([](int) { return true; });
    }
};