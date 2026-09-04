#include "buffer/BufferPoolManager.hpp"

BufferPoolManager::BufferPoolManager(
    int poolSize,
    std::unique_ptr<ReplacementPolicy> policy
)
    : replacementPolicy(std::move(policy)),
      hits(0),
      misses(0),
      evictions(0) {

    for (int i = 0; i < poolSize; i++) {
        frames.emplace_back(i);
    }
}

int BufferPoolManager::fetchPage(int pageId) {

    // -------------------------
    // BUFFER HIT
    // -------------------------

    auto existing = pageTable.find(pageId);

    if (existing != pageTable.end()) {

        int frameId = existing->second;

        hits++;

        replacementPolicy->access(frameId);

        frames[frameId].pin();

        return frameId;
    }

    // -------------------------
    // BUFFER MISS
    // -------------------------

    misses++;

    // Find an empty frame first
    for (auto& frame : frames) {

        if (!frame.isValid()) {

            int frameId = frame.getFrameId();

            BufferPage page(pageId, "Page " + std::to_string(pageId));

            frame.loadPage(page);

            pageTable[pageId] = frameId;

            replacementPolicy->insert(frameId);

            frame.pin();

            return frameId;
        }
    }

    // -------------------------
    // BUFFER FULL
    // -------------------------

    int victim = replacementPolicy->evict();

    if (victim == -1) {
        return -1;
    }

    BufferFrame& victimFrame = frames[victim];

    // Don't evict pinned pages
    if (victimFrame.getPinCount() > 0) {
        return -1;
    }

    int oldPageId = victimFrame.getPageId();

    pageTable.erase(oldPageId);

    evictions++;

    BufferPage page(
        pageId,
        "Page " + std::to_string(pageId)
    );

    victimFrame.loadPage(page);

    pageTable[pageId] = victim;

    replacementPolicy->insert(victim);

    victimFrame.pin();

    return victim;
}

void BufferPoolManager::unpinPage(int pageId) {

    auto it = pageTable.find(pageId);

    if (it == pageTable.end()) {
        return;
    }

    int frameId = it->second;

    frames[frameId].unpin();
}

void BufferPoolManager::markDirty(int pageId) {

    auto it = pageTable.find(pageId);

    if (it == pageTable.end()) {
        return;
    }

    int frameId = it->second;

    frames[frameId].setDirty(true);
}

int BufferPoolManager::getHits() const {
    return hits;
}

int BufferPoolManager::getMisses() const {
    return misses;
}

int BufferPoolManager::getEvictions() const {
    return evictions;
}

const std::vector<BufferFrame>&
BufferPoolManager::getFrames() const {
    return frames;
}