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
    lru.access(0); // 1 is now LRU, then 2, then 0

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
    fifo.access(0); // FIFO order should NOT change on access

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
    // bits: [0:1, 1:1, 2:1]
    // access frame 0 again
    clock.access(0);
    // on first evict: sweeps 0 (bit 1->0), sweeps 1 (bit 1->0), sweeps 2 (bit 1->0)
    // sweeps 0 (bit was re-accessed, bit is 1->0) or victim found
    int v1 = clock.evict();
    assert(v1 >= 0 && v1 <= 2);
    std::cout << "[PASS] test_clock_second_chance\n";
}

void test_pinned_frame_protection() {
    MetricsCollector metrics;
    BufferPoolManager bpm(3, std::make_unique<LRU>(), &metrics);

    int f0 = bpm.fetchPage(10); // Frame 0, pinned=1
    int f1 = bpm.fetchPage(20); // Frame 1, pinned=1
    int f2 = bpm.fetchPage(30); // Frame 2, pinned=1

    // Unpin only frame 1 and 2, keep frame 0 pinned!
    bpm.unpinPage(20); // f1 unpinned
    bpm.unpinPage(30); // f2 unpinned

    // Access page 40 -> needs eviction. Frame 0 is pinned, so LRU candidate cannot be frame 0!
    int fNew = bpm.fetchPage(40);
    assert(fNew != -1);
    assert(fNew != f0); // Frame 0 must NOT have been evicted!
    assert(bpm.getFrames()[f0].getPageId() == 10);
    std::cout << "[PASS] test_pinned_frame_protection\n";
}

void test_all_frames_pinned() {
    BufferPoolManager bpm(2, std::make_unique<LRU>());
    bpm.fetchPage(1); // pinned
    bpm.fetchPage(2); // pinned

    // All frames are pinned, eviction must fail gracefully and return -1
    int failed = bpm.fetchPage(3);
    assert(failed == -1);
    // Verify frames 1 and 2 still intact
    assert(bpm.getFrames()[0].getPageId() == 1);
    assert(bpm.getFrames()[1].getPageId() == 2);
    std::cout << "[PASS] test_all_frames_pinned\n";
}

void test_dirty_page_eviction() {
    MetricsCollector metrics;
    BufferPoolManager bpm(2, std::make_unique<FIFO>(), &metrics);

    bpm.accessPage(1, true); // marks dirty and unpins
    bpm.accessPage(2, false); // unpins

    // Frame 0 holds page 1 (dirty). Access page 3 -> evicts frame 0 (FIFO).
    bpm.accessPage(3, false);

    assert(metrics.getDirtyEvictions() == 1);
    assert(metrics.getDiskWrites() == 1);
    assert(metrics.getEvictions() == 1);
    std::cout << "[PASS] test_dirty_page_eviction\n";
}

void test_virtual_memory_eviction() {
    MetricsCollector metrics;
    VirtualMemoryManager vm(10, 3, std::make_unique<LRU>(), &metrics);

    vm.accessPage(0); // f0
    vm.accessPage(1); // f1
    vm.accessPage(2); // f2
    vm.accessPage(0); // hit, f0 accessed
    int evictFrame = vm.accessPage(3); // page fault, should evict frame 1 (page 1 is LRU)

    assert(evictFrame == 1);
    assert(!vm.getPageTable().isPresent(1)); // Page 1 must be unmapped!
    assert(vm.getPageTable().isPresent(3));  // Page 3 mapped to frame 1!
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
