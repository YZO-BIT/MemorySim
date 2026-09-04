#pragma once

class ReplacementPolicy {
public:
    virtual ~ReplacementPolicy() = default;

    virtual void access(int frameId) = 0;

    virtual void insert(int frameId) = 0;

    virtual void remove(int frameId) = 0;

    virtual int evict() = 0;
};