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

int LRU::evict() {
    if (order.empty()) {
        return -1;
    }

    int victim = order.front();

    order.pop_front();
    position.erase(victim);

    return victim;
}