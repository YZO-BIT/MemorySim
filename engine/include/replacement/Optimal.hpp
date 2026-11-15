#pragma once

#include "ReplacementPolicy.hpp"

#include <cstddef>
#include <unordered_map>
#include <vector>

// Optimal page replacement (Belady). For a request at index i of the
// configured reference sequence, the victim is the resident frame holding the
// page whose next use is farthest in the future. Ties (pages never used again)
// are broken by the smallest frame id, so output is fully deterministic.
//
// Complexity: setReferenceSequence O(N); notifyRequest O(1);
// evict O(F log N) worst (upper-bound lookups over future-use lists).
class Optimal : public ReplacementPolicy {
private:
    std::unordered_map<int, int> frameToPage;
    std::unordered_map<int, std::vector<int>> occurrences;
    std::vector<int> referenceSequence;
    std::size_t cursor;
    int currentPage;

    std::size_t nextUseOf(int pageId) const;

public:
    Optimal();

    void setReferenceSequence(const std::vector<int>& requests) override;

    void notifyRequest(int pageId) override;

    void access(int frameId) override;

    void insert(int frameId) override;

    void remove(int frameId) override;

    int evict(const std::function<bool(int)>& isEligible) override;

    int evict() override {
        return evict([](int) { return true; });
    }

    bool isResident(int frameId) const;

    std::size_t residentCount() const;
};
