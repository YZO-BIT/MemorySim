#include "memory/VirtualMemoryManager.hpp"

VirtualMemoryManager::VirtualMemoryManager(
    int virtualPages,
    int physicalFrames
)
    : virtualPages(virtualPages),
      physicalFrames(physicalFrames),
      frameUsed(physicalFrames, false),
      pageFaults(0) {}

int VirtualMemoryManager::accessPage(
    int virtualPage
) {

    // Page already exists
    if (pageTable.isPresent(virtualPage)) {

        int frame = pageTable.getFrame(virtualPage);

        pageTable.setReferenced(
            virtualPage,
            true
        );

        return frame;
    }

    // Page fault
    pageFaults++;

    // Find free physical frame
    for (int frame = 0;
         frame < physicalFrames;
         frame++) {

        if (!frameUsed[frame]) {

            frameUsed[frame] = true;

            pageTable.mapPage(
                virtualPage,
                frame
            );

            return frame;
        }
    }

    // For now, simple replacement:
    // replace frame 0
    int victimFrame = 0;

    for (int page = 0;
         page < virtualPages;
         page++) {

        if (
            pageTable.isPresent(page) &&
            pageTable.getFrame(page) == victimFrame
        ) {
            pageTable.unmapPage(page);
            break;
        }
    }

    pageTable.mapPage(
        virtualPage,
        victimFrame
    );

    return victimFrame;
}

int VirtualMemoryManager::getPageFaults() const {
    return pageFaults;
}

const PageTable&
VirtualMemoryManager::getPageTable() const {
    return pageTable;
}