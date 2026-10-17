#include "replacement/Clock.hpp"

Clock::Clock()
    : hand(0) {}

void Clock::access(int frameId) {
    referenceBit[frameId] = true;
}

void Clock::insert(int frameId) {
    if (referenceBit.find(frameId) != referenceBit.end()) {
        return;
    }

    frames.push_back(frameId);
    referenceBit[frameId] = true;
}

void Clock::remove(int frameId) {
    referenceBit.erase(frameId);

    for (auto it = frames.begin(); it != frames.end(); ++it) {
        if (*it == frameId) {
            frames.erase(it);

            if (!frames.empty()) {
                hand %= frames.size();
            } else {
                hand = 0;
            }

            return;
        }
    }
}

int Clock::evict(const std::function<bool(int)>& isEligible) {
    if (frames.empty()) {
        return -1;
    }

    size_t maxScans = frames.size() * 2 + 1;
    size_t scanned = 0;

    while (scanned < maxScans) {
        hand %= frames.size();
        int frameId = frames[hand];

        if (!isEligible || isEligible(frameId)) {
            if (!referenceBit[frameId]) {
                referenceBit.erase(frameId);
                int victim = frameId;
                frames.erase(frames.begin() + hand);

                if (!frames.empty()) {
                    hand %= frames.size();
                } else {
                    hand = 0;
                }

                return victim;
            }

            referenceBit[frameId] = false;
        }

        hand = (hand + 1) % frames.size();
        scanned++;
    }

    return -1;
}