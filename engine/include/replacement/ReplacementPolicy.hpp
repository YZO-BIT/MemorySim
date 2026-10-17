#pragma once

#include <functional>

class ReplacementPolicy {
public:
    virtual ~ReplacementPolicy() = default;

    virtual void access(int frameId) = 0;

    virtual void insert(int frameId) = 0;

    virtual void remove(int frameId) = 0;

    virtual int evict(const std::function<bool(int)>& isEligible) = 0;

    virtual int evict() {
        return evict([](int) { return true; });
    }
};