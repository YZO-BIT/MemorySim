#include "replacement/FIFO.hpp"

void FIFO::access(int frameId) {
    // FIFO does not change order on access.
}

void FIFO::insert(int frameId) {
    if (present.count(frameId)) {
        return;
    }

    order.push_back(frameId);
    present.insert(frameId);
}

void FIFO::remove(int frameId) {
    if (present.erase(frameId)) {
        for (auto it = order.begin(); it != order.end(); ++it) {
            if (*it == frameId) {
                order.erase(it);
                break;
            }
        }
    }
}

int FIFO::evict(const std::function<bool(int)>& isEligible) {
    for (auto it = order.begin(); it != order.end(); ) {
        int candidate = *it;
        if (!present.count(candidate)) {
            it = order.erase(it);
            continue;
        }

        if (!isEligible || isEligible(candidate)) {
            present.erase(candidate);
            order.erase(it);
            return candidate;
        }

        ++it;
    }

    return -1;
}