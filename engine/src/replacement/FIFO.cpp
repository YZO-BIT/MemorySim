#include "replacement/FIFO.hpp"

void FIFO::access(int) {
    // FIFO order is unaffected by accesses.
}

void FIFO::insert(int frameId) {
    if (position.find(frameId) != position.end()) {
        return;
    }

    order.push_back(frameId);
    position[frameId] = std::prev(order.end());
}

void FIFO::remove(int frameId) {
    auto it = position.find(frameId);

    if (it == position.end()) {
        return;
    }

    order.erase(it->second);
    position.erase(it);
}

int FIFO::evict(const std::function<bool(int)>& isEligible) {
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
