#include "metrics/MetricsCollector.hpp"

void MetricsCollector::recordRequest() {
    totalRequests++;
}

void MetricsCollector::recordBufferHit() {
    bufferHits++;
}

void MetricsCollector::recordBufferMiss() {
    bufferMisses++;
}

void MetricsCollector::recordPageFault() {
    pageFaults++;
}

void MetricsCollector::recordDiskRead() {
    diskReads++;
}

void MetricsCollector::recordDiskWrite() {
    diskWrites++;
}

void MetricsCollector::recordEviction() {
    evictions++;
}

void MetricsCollector::recordDirtyEviction() {
    dirtyEvictions++;
}

int MetricsCollector::getTotalRequests() const {
    return totalRequests;
}

int MetricsCollector::getBufferHits() const {
    return bufferHits;
}

int MetricsCollector::getBufferMisses() const {
    return bufferMisses;
}

int MetricsCollector::getPageFaults() const {
    return pageFaults;
}

int MetricsCollector::getDiskReads() const {
    return diskReads;
}

int MetricsCollector::getDiskWrites() const {
    return diskWrites;
}

int MetricsCollector::getEvictions() const {
    return evictions;
}

int MetricsCollector::getDirtyEvictions() const {
    return dirtyEvictions;
}

double MetricsCollector::getBufferHitRatio() const {

    if (totalRequests == 0) {
        return 0;
    }

    return static_cast<double>(bufferHits)
           / totalRequests;
}

double MetricsCollector::getPageFaultRate() const {

    if (totalRequests == 0) {
        return 0;
    }

    return static_cast<double>(pageFaults)
           / totalRequests;
}