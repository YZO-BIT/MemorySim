#include "memory/PageTable.hpp"

void PageTable::mapPage(
    int virtualPage,
    int physicalFrame
) {
    entries[virtualPage] =
        PageTableEntry(
            physicalFrame,
            true,
            false,
            true
        );
}

void PageTable::unmapPage(int virtualPage) {

    auto it = entries.find(virtualPage);

    if (it != entries.end()) {
        it->second.present = false;
        it->second.frameId = -1;
    }
}

bool PageTable::isPresent(int virtualPage) const {

    auto it = entries.find(virtualPage);

    if (it == entries.end()) {
        return false;
    }

    return it->second.present;
}

int PageTable::getFrame(int virtualPage) const {

    auto it = entries.find(virtualPage);

    if (it == entries.end()) {
        return -1;
    }

    return it->second.frameId;
}

void PageTable::setDirty(
    int virtualPage,
    bool value
) {
    entries[virtualPage].dirty = value;
}

void PageTable::setReferenced(
    int virtualPage,
    bool value
) {
    entries[virtualPage].referenced = value;
}

const std::unordered_map<int, PageTableEntry>&
PageTable::getEntries() const {
    return entries;
}