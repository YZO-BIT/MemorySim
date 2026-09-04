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

int Clock::evict() {
    if (frames.empty()) {
        return -1;
    }

    while (true) {
        hand %= frames.size();

        int frameId = frames[hand];

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

        hand = (hand + 1) % frames.size();
    }
}