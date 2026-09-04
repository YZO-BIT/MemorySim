#include "replacement/FIFO.hpp"

void FIFO::access(int frameId) {
    // FIFO does not change order on access.
}

void FIFO::insert(int frameId) {
    if (present.count(frameId)) {
        return;
    }

    order.push(frameId);
    present.insert(frameId);
}

void FIFO::remove(int frameId) {
    present.erase(frameId);
}

int FIFO::evict() {
    while (!order.empty()) {
        int victim = order.front();
        order.pop();

        if (present.count(victim)) {
            present.erase(victim);
            return victim;
        }
    }

    return -1;
}