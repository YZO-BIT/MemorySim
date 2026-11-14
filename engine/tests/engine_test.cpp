#include <iostream>
#include <cassert>
#include <memory>
#include <vector>

#include "buffer/BufferPoolManager.hpp"
#include "memory/VirtualMemoryManager.hpp"
#include "replacement/LRU.hpp"
#include "replacement/FIFO.hpp"
#include "replacement/Clock.hpp"
#include "metrics/MetricsCollector.hpp"
#include "workload/WorkloadGenerator.hpp"

void test_lru_victim_selection() {
    LRU lru;
    lru.insert(0);
    lru.insert(1);
    lru.insert(2);
    lru.access(0); /

    assert(lru.evict() == 1);
    assert(lru.evict() == 2);
    assert(lru.evict() == 0);
    assert(lru.evict() == -1);
    std::cout << "[PASS] test_lru_victim_selection\n";
}

void test_fifo_victim_selection() {
    FIFO fifo;
    fifo.insert(0);
    fifo.insert(1);
    fifo.insert(2);
    fifo.access(0); 

    assert(fifo.evict() == 0);
    assert(fifo.evict() == 1);
    assert(fifo.evict() == 2);
    assert(fifo.evict() == -1);
    std::cout << "[PASS] test_fifo_victim_selection\n";
}

void test_clock_second_chance() {
    Clock clock;
    clock.insert(0);
    clock.insert(1);
    clock.insert(2);
    clock.access(0);
    int v1 = clock.evict();
    assert(v1 >= 0 && v1 <= 2);
    std::cout << "[PASS] test_clock_second_chance\n";
}

void test_pinned_frame_protection() {
    MetricsCollector metrics;
    BufferPoolManager bpm(3, std::make_unique<LRU>(), &metrics);

    int f0 = bpm.fetchPage(10);
    int f1 = bpm.fetchPage(20);
    int f2 = bpm.fetchPage(30);

    bpm.unpinPage(20);
    bpm.unpinPage(30);

    int fNew = bpm.fetchPage(40);
    assert(fNew != -1);
    assert(fNew != f0);
    assert(bpm.getFrames()[f0].getPageId() == 10);
    std::cout << "[PASS] test_pinned_frame_protection\n";
}

void test_all_frames_pinned() {
    BufferPoolManager bpm(2, std::make_unique<LRU>());
    bpm.fetchPage(1);
    bpm.fetchPage(2);

    int failed = bpm.fetchPage(3);
    assert(failed == -1);
    assert(bpm.getFrames()[0].getPageId() == 1);
    assert(bpm.getFrames()[1].getPageId() == 2);
    std::cout << "[PASS] test_all_frames_pinned\n";
}

void test_dirty_page_eviction() {
    MetricsCollector metrics;
    BufferPoolManager bpm(2, std::make_unique<FIFO>(), &metrics);

    bpm.accessPage(1, true); 
    bpm.accessPage(2, false);

    bpm.accessPage(3, false);

    assert(metrics.getDirtyEvictions() == 1);
    assert(metrics.getDiskWrites() == 1);
    assert(metrics.getEvictions() == 1);
    std::cout << "[PASS] test_dirty_page_eviction\n";
}

void test_virtual_memory_eviction() {
    MetricsCollector metrics;
    VirtualMemoryManager vm(10, 3, std::make_unique<LRU>(), &metrics);

    vm.accessPage(0); 
    vm.accessPage(1); 
    vm.accessPage(2); 
    vm.accessPage(0); 
    int evictFrame = vm.accessPage(3);

    assert(evictFrame == 1);
    assert(!vm.getPageTable().isPresent(1)); 
    assert(vm.getPageTable().isPresent(3));  
    assert(vm.getPageTable().getFrame(3) == 1);
    assert(vm.getPageFaults() == 4);
    std::cout << "[PASS] test_virtual_memory_eviction\n";
}

void test_workload_generator_deterministic() {
    auto seq1 = WorkloadGenerator::generate(WorkloadType::Random, 20, 10, 12345);
    auto seq2 = WorkloadGenerator::generate(WorkloadType::Random, 20, 10, 12345);
    assert(seq1 == seq2);

    auto highLoc = WorkloadGenerator::generate(WorkloadType::HighLocality, 100, 10, 42);
    assert(highLoc.size() == 100);
    for (int p : highLoc) {
        assert(p >= 0 && p < 10);
    }
    std::cout << "[PASS] test_workload_generator_deterministic\n";
}

void test_invalid_inputs() {
    BufferPoolManager bpm(0, std::make_unique<LRU>());
    assert(bpm.fetchPage(1) == -1);
    assert(bpm.accessPage(-5) == -1);

    VirtualMemoryManager vm(0, 0, std::make_unique<LRU>());
    assert(vm.accessPage(0) == -1);
    assert(vm.accessPage(-1) == -1);

    auto emptyWorkload = WorkloadGenerator::generate(WorkloadType::Random, 0, 10);
    assert(emptyWorkload.empty());
    std::cout << "[PASS] test_invalid_inputs\n";
}

int main() {
    std::cout << "Running C++ Engine Automated Tests...\n";
    test_lru_victim_selection();
    test_fifo_victim_selection();
    test_clock_second_chance();
    test_pinned_frame_protection();
    test_all_frames_pinned();
    test_dirty_page_eviction();
    test_virtual_memory_eviction();
    test_workload_generator_deterministic();
    test_invalid_inputs();
    std::cout << "All C++ Engine Tests Passed Successfully!\n";
    return 0;
}
