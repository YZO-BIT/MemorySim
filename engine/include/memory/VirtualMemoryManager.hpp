#pragma once

#include "PageTable.hpp"

#include <vector>

class VirtualMemoryManager {
private:
    int virtualPages;
    int physicalFrames;

    PageTable pageTable;

    std::vector<bool> frameUsed;

    int pageFaults;

public:
    VirtualMemoryManager(
        int virtualPages,
        int physicalFrames
    );

    int accessPage(int virtualPage);

    int getPageFaults() const;

    const PageTable& getPageTable() const;
};