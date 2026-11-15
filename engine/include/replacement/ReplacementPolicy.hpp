#pragma once

#include <cstddef>
#include <functional>
#include <vector>

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

    // Optional hooks for lookahead policies (e.g. Optimal). Default: no-op.
    virtual void setReferenceSequence(const std::vector<int>& requests) {
        (void)requests;
    }

    virtual void notifyRequest(int pageId) {
        (void)pageId;
    }

    // Sentinel meaning "no future use".
    static constexpr std::size_t kNeverUse = static_cast<std::size_t>(-1);
};