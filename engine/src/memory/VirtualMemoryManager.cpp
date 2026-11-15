#include "memory/VirtualMemoryManager.hpp"
#include "replacement/LRU.hpp"

VirtualMemoryManager::VirtualMemoryManager(
    int virtualPages,
    int physicalFrames,
    std::unique_ptr<ReplacementPolicy> policy,
    MetricsCollector* metrics
)
    : virtualPages(virtualPages),
      physicalFrames(physicalFrames),
      frameUsed(physicalFrames > 0 ? physicalFrames : 0, false),
      frameToVirtualPage(physicalFrames > 0 ? physicalFrames : 0, -1),
      replacementPolicy(policy ? std::move(policy) : std::make_unique<LRU>()),
      metrics(metrics),
      pageFaults(0) {}

int VirtualMemoryManager::accessPage(
    int virtualPage,
    bool isWrite
) {
    if (virtualPage < 0 || virtualPage >= virtualPages || physicalFrames <= 0) {
        return -1;
    }

    if (metrics) {
        metrics->recordRequest();
    }

    // Lookahead policies must observe the request regardless of hit/miss.
    if (replacementPolicy) {
        replacementPolicy->notifyRequest(virtualPage);
    }

    // Page already exists (Hit)
    if (pageTable.isPresent(virtualPage)) {
        int frame = pageTable.getFrame(virtualPage);

        pageTable.setReferenced(virtualPage, true);
        if (isWrite) {
            pageTable.setDirty(virtualPage, true);
        }

        if (replacementPolicy) {
            replacementPolicy->access(frame);
        }

        if (metrics) {
            metrics->recordBufferHit();
        }

        return frame;
    }

    // Page fault
    pageFaults++;
    if (metrics) {
        metrics->recordBufferMiss();
        metrics->recordPageFault();
        metrics->recordDiskRead();
    }

    // Find free physical frame
    for (int frame = 0; frame < physicalFrames; frame++) {
        if (!frameUsed[frame]) {
            frameUsed[frame] = true;
            frameToVirtualPage[frame] = virtualPage;

            pageTable.mapPage(virtualPage, frame);
            if (isWrite) {
                pageTable.setDirty(virtualPage, true);
            }

            if (replacementPolicy) {
                replacementPolicy->insert(frame);
            }

            return frame;
        }
    }

    // Eviction via replacement policy
    int victimFrame = replacementPolicy ? replacementPolicy->evict() : -1;
    if (victimFrame < 0 || victimFrame >= physicalFrames) {
        return -1;
    }

    int oldVirtualPage = frameToVirtualPage[victimFrame];
    if (oldVirtualPage >= 0) {
        if (pageTable.isDirty(oldVirtualPage)) {
            if (metrics) {
                metrics->recordDiskWrite();
                metrics->recordDirtyEviction();
            }
        }
        if (metrics) {
            metrics->recordEviction();
        }
        pageTable.unmapPage(oldVirtualPage);
    }

    frameToVirtualPage[victimFrame] = virtualPage;
    pageTable.mapPage(virtualPage, victimFrame);
    if (isWrite) {
        pageTable.setDirty(virtualPage, true);
    }

    if (replacementPolicy) {
        replacementPolicy->insert(victimFrame);
    }

    return victimFrame;
}

int VirtualMemoryManager::getPageFaults() const {
    return pageFaults;
}

const PageTable&
VirtualMemoryManager::getPageTable() const {
    return pageTable;
}

int VirtualMemoryManager::getPhysicalFrames() const {
    return physicalFrames;
}

int VirtualMemoryManager::getVirtualPages() const {
    return virtualPages;
}

int VirtualMemoryManager::getPageForFrame(int frame) const {
    if (frame >= 0 && frame < static_cast<int>(frameToVirtualPage.size())) {
        return frameToVirtualPage[frame];
    }
    return -1;
}

void VirtualMemoryManager::setMetricsCollector(MetricsCollector* m) {
    metrics = m;
}

void VirtualMemoryManager::setReplacementPolicy(std::unique_ptr<ReplacementPolicy> policy) {
    replacementPolicy = std::move(policy);
}

void VirtualMemoryManager::setReferenceSequence(const std::vector<int>& requests) {
    if (replacementPolicy) {
        replacementPolicy->setReferenceSequence(requests);
    }
}