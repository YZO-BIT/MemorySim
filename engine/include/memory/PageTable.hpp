#pragma once

#include <unordered_map>

struct PageTableEntry {
    int frameId;

    bool present;
    bool dirty;
    bool referenced;

    PageTableEntry(
        int frameId = -1,
        bool present = false,
        bool dirty = false,
        bool referenced = false
    )
        : frameId(frameId),
          present(present),
          dirty(dirty),
          referenced(referenced) {}
};

class PageTable {
private:
    std::unordered_map<int, PageTableEntry> entries;

public:
    void mapPage(int virtualPage, int physicalFrame);

    void unmapPage(int virtualPage);

    bool isPresent(int virtualPage) const;

    int getFrame(int virtualPage) const;

    void setDirty(int virtualPage, bool value);

    void setReferenced(int virtualPage, bool value);

    bool isDirty(int virtualPage) const;

    bool isReferenced(int virtualPage) const;

    const std::unordered_map<int, PageTableEntry>&
    getEntries() const;
};