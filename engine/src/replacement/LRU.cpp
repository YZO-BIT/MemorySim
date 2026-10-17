#include "replacement/LRU.hpp"

void LRU::access(int frameId) {
    auto it = position.find(frameId);

    if (it != position.end()) {
        order.erase(it->second);
    }

    order.push_back(frameId);
    position[frameId] = std::prev(order.end());
}

void LRU::insert(int frameId) {
    access(frameId);
}

void LRU::remove(int frameId) {
    auto it = position.find(frameId);

    if (it != position.end()) {
        order.erase(it->second);
        position.erase(it);
    }
}

int LRU::evict(const std::function<bool(int)>& isEligible) {
    if (order.empty()) {
        return -1;
    }

    for (auto it = order.begin(); it != order.end(); ++it) {
        int candidate = *it;
        if (!isEligible || isEligible(candidate)) {
            position.erase(candidate);
            order.erase(it);
            return candidate;
        }
    }

    return -1;
}