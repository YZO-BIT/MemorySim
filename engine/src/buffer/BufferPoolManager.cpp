#include "buffer/BufferPoolManager.hpp"

BufferPoolManager::BufferPoolManager(
    int poolSize,
    std::unique_ptr<ReplacementPolicy> policy,
    MetricsCollector* metrics
)
    : replacementPolicy(std::move(policy)),
      metrics(metrics),
      hits(0),
      misses(0),
      evictions(0) {

    for (int i = 0; i < poolSize; i++) {
        frames.emplace_back(i);
    }
}

int BufferPoolManager::fetchPage(int pageId) {
    if (pageId < 0 || frames.empty()) {
        return -1;
    }

    auto existing = pageTable.find(pageId);
    if (existing != pageTable.end()) {
        int frameId = existing->second;
        hits++;

        if (metrics) {
            metrics->recordBufferHit();
        }

        if (replacementPolicy) {
            replacementPolicy->access(frameId);
        }

        frames[frameId].pin();
        return frameId;
    }

    misses++;
    if (metrics) {
        metrics->recordBufferMiss();
        metrics->recordDiskRead();
    }

    for (auto& frame : frames) {
        if (!frame.isValid()) {
            int frameId = frame.getFrameId();
            BufferPage page(pageId, "Page " + std::to_string(pageId));

            frame.loadPage(page);
            pageTable[pageId] = frameId;

            if (replacementPolicy) {
                replacementPolicy->insert(frameId);
            }

            frame.pin();
            return frameId;
        }
    }

    auto isEligible = [this](int frameId) {
        if (frameId < 0 || frameId >= static_cast<int>(frames.size())) {
            return false;
        }
        return frames[frameId].getPinCount() == 0;
    };

    int victim = replacementPolicy ? replacementPolicy->evict(isEligible) : -1;
    if (victim < 0 || victim >= static_cast<int>(frames.size())) {
        return -1;
    }

    BufferFrame& victimFrame = frames[victim];
    if (victimFrame.getPinCount() > 0) {
        return -1;
    }

    int oldPageId = victimFrame.getPageId();

    if (victimFrame.isDirty()) {
        if (metrics) {
            metrics->recordDiskWrite();
            metrics->recordDirtyEviction();
        }
        victimFrame.setDirty(false);
    }

    pageTable.erase(oldPageId);
    evictions++;
    if (metrics) {
        metrics->recordEviction();
    }

    BufferPage page(pageId, "Page " + std::to_string(pageId));
    victimFrame.loadPage(page);
    pageTable[pageId] = victim;

    if (replacementPolicy) {
        replacementPolicy->insert(victim);
    }

    victimFrame.pin();
    return victim;
}

bool BufferPoolManager::unpinPage(int pageId, bool isDirty) {
    auto it = pageTable.find(pageId);
    if (it == pageTable.end()) {
        return false;
    }

    int frameId = it->second;
    if (isDirty) {
        frames[frameId].setDirty(true);
    }
    frames[frameId].unpin();
    return true;
}

int BufferPoolManager::accessPage(int pageId, bool isWrite) {
    if (metrics) {
        metrics->recordRequest();
    }

    int frameId = fetchPage(pageId);
    if (frameId != -1) {
        unpinPage(pageId, isWrite);
    }
    return frameId;
}

void BufferPoolManager::markDirty(int pageId) {
    auto it = pageTable.find(pageId);
    if (it == pageTable.end()) {
        return;
    }

    int frameId = it->second;
    frames[frameId].setDirty(true);
}

bool BufferPoolManager::flushPage(int pageId) {
    auto it = pageTable.find(pageId);
    if (it == pageTable.end()) {
        return false;
    }

    int frameId = it->second;
    if (frames[frameId].isDirty()) {
        if (metrics) {
            metrics->recordDiskWrite();
        }
        frames[frameId].setDirty(false);
    }
    return true;
}

void BufferPoolManager::flushAllPages() {
    for (auto& frame : frames) {
        if (frame.isValid() && frame.isDirty()) {
            if (metrics) {
                metrics->recordDiskWrite();
            }
            frame.setDirty(false);
        }
    }
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

int BufferPoolManager::getPoolSize() const {
    return static_cast<int>(frames.size());
}

const std::vector<BufferFrame>& BufferPoolManager::getFrames() const {
    return frames;
}

void BufferPoolManager::setMetricsCollector(MetricsCollector* m) {
    metrics = m;
}