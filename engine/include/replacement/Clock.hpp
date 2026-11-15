#pragma once

#include "ReplacementPolicy.hpp"

#include <cstddef>
#include <functional>
#include <unordered_map>
#include <vector>

class Clock : public ReplacementPolicy {
private:
    std::vector<int> ring;

    std::unordered_map<int, std::size_t> indexOf;

    std::unordered_map<int, bool> referenceBit;

    std::size_t hand;

public:
    Clock();

    void access(int frameId) override;

    void insert(int frameId) override;

    void remove(int frameId) override;

    int evict(const std::function<bool(int)>& isEligible) override;

    int evict() override {
        return evict([](int) { return true; });
    }

    bool isResident(int frameId) const;

    bool isReferenced(int frameId) const;

    std::size_t residentCount() const;
};
