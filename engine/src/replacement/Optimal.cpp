#include "replacement/Optimal.hpp"

#include <algorithm>
#include <limits>

Optimal::Optimal()
    : cursor(0),
      currentPage(-1) {}

void Optimal::setReferenceSequence(const std::vector<int>& requests) {
    referenceSequence = requests;
    occurrences.clear();
    for (std::size_t i = 0; i < referenceSequence.size(); ++i) {
        occurrences[referenceSequence[i]].push_back(static_cast<int>(i));
    }
    cursor = 0;
    currentPage = -1;
    frameToPage.clear();
}

// Requests are expected in the same order as the configured sequence: the
// cursor only tracks the current index. If the request stream diverges from
// the sequence (or the sequence is empty), the policy degrades to a
// deterministic FIFO-like fallback (all next uses look like "never again")
// until a new sequence is configured.
void Optimal::notifyRequest(int pageId) {
    currentPage = pageId;
    if (cursor < referenceSequence.size() && referenceSequence[cursor] == pageId) {
        cursor = cursor + 1;
    } else {
        cursor = referenceSequence.size();
    }
}

void Optimal::access(int frameId) {
    // Temporal information is irrelevant for OPT; only residency matters.
    if (frameToPage.find(frameId) == frameToPage.end()) {
        return;
    }
}

void Optimal::insert(int frameId) {
    if (frameToPage.find(frameId) != frameToPage.end()) {
        return;
    }
    frameToPage[frameId] = currentPage;
}

void Optimal::remove(int frameId) {
    frameToPage.erase(frameId);
}

std::size_t Optimal::nextUseOf(int pageId) const {
    auto it = occurrences.find(pageId);
    if (it == occurrences.end()) {
        return kNeverUse;
    }
    // First occurrence at or after the cursor. The cursor already points at
    // the next request, so equality is a valid imminent future use.
    auto posIt = std::lower_bound(it->second.begin(), it->second.end(), static_cast<int>(cursor));
    if (posIt == it->second.end()) {
        return kNeverUse;
    }
    return static_cast<std::size_t>(*posIt);
}

int Optimal::evict(const std::function<bool(int)>& isEligible) {
    int victim = -1;
    std::size_t bestNextUse = 0;

    for (const auto& entry : frameToPage) {
        const int frameId = entry.first;
        if (!isEligible(frameId)) {
            continue;
        }
        const std::size_t nextUse = nextUseOf(entry.second);
        if (victim == -1 || nextUse > bestNextUse ||
            (nextUse == bestNextUse && frameId < victim)) {
            victim = frameId;
            bestNextUse = nextUse;
        }
    }

    if (victim == -1) {
        return -1;
    }

    frameToPage.erase(victim);
    return victim;
}

bool Optimal::isResident(int frameId) const {
    return frameToPage.find(frameId) != frameToPage.end();
}

std::size_t Optimal::residentCount() const {
    return frameToPage.size();
}
