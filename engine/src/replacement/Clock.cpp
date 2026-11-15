#include "replacement/Clock.hpp"

Clock::Clock()
    : hand(0) {}

void Clock::access(int frameId) {
    if (indexOf.find(frameId) == indexOf.end()) {
        return;
    }

    referenceBit[frameId] = true;
}

void Clock::insert(int frameId) {
    if (indexOf.find(frameId) != indexOf.end()) {
        return;
    }

    ring.push_back(frameId);
    indexOf[frameId] = ring.size() - 1;
    referenceBit[frameId] = true;
}

void Clock::remove(int frameId) {
    auto it = indexOf.find(frameId);

    if (it == indexOf.end()) {
        return;
    }

    std::size_t idx = it->second;
    ring.erase(ring.begin() + static_cast<std::ptrdiff_t>(idx));
    referenceBit.erase(frameId);
    indexOf.erase(it);

    if (ring.empty()) {
        hand = 0;
        return;
    }

    for (std::size_t i = 0; i < ring.size(); ++i) {
        indexOf[ring[i]] = i;
    }

    if (idx < hand) {
        hand = hand - 1;
    }

    if (hand >= ring.size()) {
        hand = 0;
    }
}

int Clock::evict(const std::function<bool(int)>& isEligible) {
    if (ring.empty()) {
        return -1;
    }

    const std::size_t n = ring.size();
    const std::size_t maxScans = 2 * n;

    for (std::size_t scanned = 0; scanned < maxScans; ++scanned) {
        std::size_t idx = hand % n;
        int candidate = ring[idx];

        if (isEligible(candidate)) {
            if (!referenceBit[candidate]) {
                ring.erase(ring.begin() + static_cast<std::ptrdiff_t>(idx));
                referenceBit.erase(candidate);
                indexOf.erase(candidate);

                for (std::size_t i = 0; i < ring.size(); ++i) {
                    indexOf[ring[i]] = i;
                }

                if (ring.empty()) {
                    hand = 0;
                } else if (hand >= ring.size()) {
                    hand = 0;
                }

                return candidate;
            }

            referenceBit[candidate] = false;
        }

        hand = (hand + 1) % n;
    }

    return -1;
}

bool Clock::isResident(int frameId) const {
    return indexOf.find(frameId) != indexOf.end();
}

bool Clock::isReferenced(int frameId) const {
    auto it = referenceBit.find(frameId);

    return it != referenceBit.end() && it->second;
}

std::size_t Clock::residentCount() const {
    return ring.size();
}
