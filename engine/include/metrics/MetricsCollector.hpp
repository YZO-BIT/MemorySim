#pragma once

class MetricsCollector {
private:
    int totalRequests = 0;
    int bufferHits = 0;
    int bufferMisses = 0;
    int pageFaults = 0;
    int diskReads = 0;
    int diskWrites = 0;
    int evictions = 0;
    int dirtyEvictions = 0;

public:
    void recordRequest();

    void recordBufferHit();

    void recordBufferMiss();

    void recordPageFault();

    void recordDiskRead();

    void recordDiskWrite();

    void recordEviction();

    void recordDirtyEviction();

    int getTotalRequests() const;
    int getBufferHits() const;
    int getBufferMisses() const;
    int getPageFaults() const;
    int getDiskReads() const;
    int getDiskWrites() const;
    int getEvictions() const;
    int getDirtyEvictions() const;

    double getBufferHitRatio() const;
    double getPageFaultRate() const;
    double getBufferHitPercentage() const;
    double getPageFaultPercentage() const;

    void reset();
};