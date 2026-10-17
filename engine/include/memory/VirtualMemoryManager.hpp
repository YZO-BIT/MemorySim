#pragma once

#include "PageTable.hpp"
#include "replacement/ReplacementPolicy.hpp"
#include "metrics/MetricsCollector.hpp"

#include <memory>
#include <vector>

class VirtualMemoryManager {
private:
    int virtualPages;
    int physicalFrames;

    PageTable pageTable;

    std::vector<bool> frameUsed;
    std::vector<int> frameToVirtualPage;

    std::unique_ptr<ReplacementPolicy> replacementPolicy;
    MetricsCollector* metrics;

    int pageFaults;

public:
    VirtualMemoryManager(
        int virtualPages,
        int physicalFrames,
        std::unique_ptr<ReplacementPolicy> policy = nullptr,
        MetricsCollector* metrics = nullptr
    );

    int accessPage(int virtualPage, bool isWrite = false);

    int getPageFaults() const;

    const PageTable& getPageTable() const;

    int getPhysicalFrames() const;

    int getVirtualPages() const;

    int getPageForFrame(int frame) const;

    void setMetricsCollector(MetricsCollector* m);

    void setReplacementPolicy(std::unique_ptr<ReplacementPolicy> policy);
};