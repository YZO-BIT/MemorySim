#pragma once

#include "ReplacementPolicy.hpp"

#include <list>
#include <unordered_map>

class FIFO : public ReplacementPolicy {
private:
    std::list<int> order;

    std::unordered_map<int, std::list<int>::iterator> position;

public:
    void access(int frameId) override;

    void insert(int frameId) override;

    void remove(int frameId) override;

    int evict(const std::function<bool(int)>& isEligible) override;

    int evict() override {
        return evict([](int) { return true; });
    }
};
