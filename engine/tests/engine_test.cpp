#include <cstdio>
#include <functional>
#include <memory>
#include <vector>

#include "buffer/BufferPoolManager.hpp"
#include "memory/VirtualMemoryManager.hpp"
#include "replacement/LRU.hpp"
#include "replacement/FIFO.hpp"
#include "replacement/Clock.hpp"
#include "replacement/Optimal.hpp"
#include "metrics/MetricsCollector.hpp"
#include "workload/WorkloadGenerator.hpp"

static int checksRun = 0;
static int checksFailed = 0;

#define CHECK(cond)                                                       \
    do {                                                                  \
        ++checksRun;                                                      \
        if (!(cond)) {                                                    \
            ++checksFailed;                                               \
            std::printf("[FAIL] %s:%d: %s\n", __FILE__, __LINE__, #cond); \
        }                                                                 \
    } while (0)

static void section(const char* name) {
    std::printf("-- %s\n", name);
}

static void done(const char* name) {
    if (checksFailed == 0) {
        std::printf("[PASS] %s\n", name);
    }
}

// =====================================================================
// A. LRU
// =====================================================================

static void test_lru_basic_eviction() {
    section("LRU basic insert/access/evict");
    LRU lru;
    lru.insert(0);
    lru.insert(1);
    lru.insert(2);
    lru.access(0);

    CHECK(lru.evict() == 1);
    CHECK(lru.evict() == 2);
    CHECK(lru.evict() == 0);
    CHECK(lru.evict() == -1);
    done("test_lru_basic_eviction");
}

static void test_lru_access_changes_order() {
    section("LRU access updates recency");
    LRU lru;
    lru.insert(0);
    lru.insert(1);
    lru.insert(2);
    lru.access(1);
    lru.access(0);

    CHECK(lru.evict() == 2);
    CHECK(lru.evict() == 1);
    CHECK(lru.evict() == 0);
    done("test_lru_access_changes_order");
}

static void test_lru_duplicate_insert() {
    section("LRU duplicate insertion does not duplicate");
    LRU lru;
    lru.insert(0);
    lru.insert(1);
    lru.insert(2);
    lru.insert(1);

    CHECK(lru.evict() == 0);
    CHECK(lru.evict() == 2);
    CHECK(lru.evict() == 1);
    CHECK(lru.evict() == -1);
    done("test_lru_duplicate_insert");
}

static void test_lru_remove() {
    section("LRU remove");
    LRU lru;
    lru.insert(0);
    lru.insert(1);
    lru.insert(2);
    lru.remove(1);
    lru.remove(9);

    CHECK(lru.evict() == 0);
    CHECK(lru.evict() == 2);
    CHECK(lru.evict() == -1);
    done("test_lru_remove");
}

static void test_lru_nonresident_access_not_inserted() {
    section("LRU access of non-resident frame does not insert");
    LRU lru;
    lru.insert(0);
    lru.insert(1);
    lru.access(99);

    CHECK(lru.evict() == 0);
    CHECK(lru.evict() == 1);
    CHECK(lru.evict() == -1);

    LRU empty;
    empty.access(3);
    CHECK(empty.evict() == -1);
    done("test_lru_nonresident_access_not_inserted");
}

static void test_lru_pinned_skip() {
    section("LRU pinned frame skipping");
    LRU lru;
    lru.insert(0);
    lru.insert(1);
    lru.insert(2);

    CHECK(lru.evict([](int f) { return f != 0; }) == 1);
    CHECK(lru.evict() == 0);
    CHECK(lru.evict() == 2);
    CHECK(lru.evict() == -1);
    done("test_lru_pinned_skip");
}

static void test_lru_all_pinned() {
    section("LRU all-pinned eviction fails without corruption");
    LRU lru;
    lru.insert(0);
    lru.insert(1);

    CHECK(lru.evict([](int) { return false; }) == -1);
    CHECK(lru.evict() == 0);
    CHECK(lru.evict() == 1);
    CHECK(lru.evict() == -1);
    done("test_lru_all_pinned");
}

// =====================================================================
// B. FIFO
// =====================================================================

static void test_fifo_basic_eviction() {
    section("FIFO basic insert/evict in insertion order");
    FIFO fifo;
    fifo.insert(0);
    fifo.insert(1);
    fifo.insert(2);
    fifo.access(0);

    CHECK(fifo.evict() == 0);
    CHECK(fifo.evict() == 1);
    CHECK(fifo.evict() == 2);
    CHECK(fifo.evict() == -1);
    done("test_fifo_basic_eviction");
}

static void test_fifo_access_ignores_recency() {
    section("FIFO access does not change insertion order");
    FIFO fifo;
    fifo.insert(0);
    fifo.insert(1);
    fifo.insert(2);
    fifo.access(2);
    fifo.access(2);
    fifo.access(0);

    CHECK(fifo.evict() == 0);
    CHECK(fifo.evict() == 1);
    CHECK(fifo.evict() == 2);
    done("test_fifo_access_ignores_recency");
}

static void test_fifo_duplicate_insert() {
    section("FIFO duplicate insertion does not duplicate");
    FIFO fifo;
    fifo.insert(0);
    fifo.insert(1);
    fifo.insert(0);
    fifo.insert(1);

    CHECK(fifo.evict() == 0);
    CHECK(fifo.evict() == 1);
    CHECK(fifo.evict() == -1);
    done("test_fifo_duplicate_insert");
}

static void test_fifo_remove() {
    section("FIFO remove");
    FIFO fifo;
    fifo.insert(0);
    fifo.insert(1);
    fifo.insert(2);
    fifo.remove(1);
    fifo.remove(9);

    CHECK(fifo.evict() == 0);
    CHECK(fifo.evict() == 2);
    CHECK(fifo.evict() == -1);
    done("test_fifo_remove");
}

static void test_fifo_pinned_skip() {
    section("FIFO pinned frame skipping");
    FIFO fifo;
    fifo.insert(0);
    fifo.insert(1);
    fifo.insert(2);

    CHECK(fifo.evict([](int f) { return f != 0; }) == 1);
    CHECK(fifo.evict() == 0);
    CHECK(fifo.evict() == 2);
    CHECK(fifo.evict() == -1);
    done("test_fifo_pinned_skip");
}

static void test_fifo_all_pinned() {
    section("FIFO all-pinned eviction fails without corruption");
    FIFO fifo;
    fifo.insert(0);
    fifo.insert(1);

    CHECK(fifo.evict([](int) { return false; }) == -1);
    CHECK(fifo.evict() == 0);
    CHECK(fifo.evict() == 1);
    CHECK(fifo.evict() == -1);
    done("test_fifo_all_pinned");
}

// =====================================================================
// C. Clock
// =====================================================================

static void test_clock_initial_state() {
    section("Clock initial reference bits");
    Clock clock;
    clock.insert(0);
    clock.insert(1);
    clock.insert(2);

    CHECK(clock.isResident(0));
    CHECK(clock.isResident(1));
    CHECK(clock.isResident(2));
    CHECK(!clock.isResident(3));
    CHECK(clock.residentCount() == 3);
    CHECK(clock.isReferenced(0));
    CHECK(clock.isReferenced(1));
    CHECK(clock.isReferenced(2));
    done("test_clock_initial_state");
}

static void test_clock_sweep_clears_bits() {
    section("Clock sweep clears reference bits then evicts hand frame");
    Clock clock;
    clock.insert(0);
    clock.insert(1);
    clock.insert(2);

    CHECK(clock.evict() == 0);
    CHECK(!clock.isReferenced(1));
    CHECK(!clock.isReferenced(2));

    clock.access(1);
    CHECK(clock.isReferenced(1));
    done("test_clock_sweep_clears_bits");
}

static void test_clock_second_chance_spared() {
    section("Clock referenced frame receives second chance");
    Clock clock;
    clock.insert(0);
    clock.insert(1);
    clock.insert(2);
    CHECK(clock.evict() == 0);

    clock.access(1);
    clock.insert(3);

    CHECK(clock.evict() == 2);
    CHECK(clock.isResident(1));
    CHECK(clock.isResident(3));
    done("test_clock_second_chance_spared");
}

static void test_clock_hand_advancement() {
    section("Clock hand advances through ring in order");
    Clock clock;
    clock.insert(0);
    clock.insert(1);
    clock.insert(2);

    CHECK(clock.evict() == 0);
    CHECK(clock.evict() == 1);
    CHECK(clock.evict() == 2);
    CHECK(clock.evict() == -1);
    done("test_clock_hand_advancement");
}

static void test_clock_remove_and_reinsert() {
    section("Clock remove adjusts hand and reinsert gets fresh bit");
    Clock clock;
    clock.insert(0);
    clock.insert(1);
    clock.insert(2);
    CHECK(clock.evict() == 0);

    clock.access(2);
    clock.insert(3);
    clock.remove(1);

    CHECK(!clock.isResident(1));
    CHECK(clock.residentCount() == 2);

    CHECK(clock.evict() == 2);
    CHECK(clock.evict() == 3);
    CHECK(clock.evict() == -1);

    clock.insert(4);
    CHECK(clock.isResident(4));
    CHECK(clock.isReferenced(4));
    done("test_clock_remove_and_reinsert");
}

static void test_clock_pinned_skip() {
    section("Clock pinned frames skipped");
    Clock clock;
    clock.insert(0);
    clock.insert(1);
    clock.insert(2);

    CHECK(clock.evict([](int f) { return f != 1; }) == 0);
    CHECK(clock.isResident(1));

    CHECK(clock.evict([](int f) { return f != 1; }) == 2);
    CHECK(clock.isResident(1));

    CHECK(clock.evict() == 1);
    CHECK(clock.evict() == -1);
    done("test_clock_pinned_skip");
}

static void test_clock_all_pinned_no_mutation() {
    section("Clock all-pinned eviction fails without mutating bits");
    Clock clock;
    clock.insert(0);
    clock.insert(1);
    clock.insert(2);

    CHECK(clock.evict([](int) { return false; }) == -1);
    CHECK(clock.isReferenced(0));
    CHECK(clock.isReferenced(1));
    CHECK(clock.isReferenced(2));

    CHECK(clock.evict() == 0);
    CHECK(clock.evict() == 1);
    CHECK(clock.evict() == 2);
    done("test_clock_all_pinned_no_mutation");
}

static void test_clock_nonresident_access_regression() {
    section("Clock non-resident access does not create phantom state");
    Clock clock;
    clock.access(5);
    CHECK(!clock.isResident(5));

    clock.insert(5);
    CHECK(clock.isResident(5));

    clock.insert(0);
    CHECK(clock.evict() == 5);
    CHECK(clock.evict() == 0);
    CHECK(clock.evict() == -1);

    Clock c2;
    c2.insert(0);
    c2.insert(1);
    c2.access(42);
    CHECK(c2.evict() == 0);
    CHECK(c2.evict() == 1);
    CHECK(c2.evict() == -1);
    done("test_clock_nonresident_access_regression");
}

static void test_clock_remove_nonresident() {
    section("Clock remove of non-resident frame is a no-op");
    Clock clock;
    clock.insert(0);
    clock.insert(1);
    clock.remove(42);

    CHECK(clock.residentCount() == 2);
    CHECK(clock.evict() == 0);
    CHECK(clock.evict() == 1);
    done("test_clock_remove_nonresident");
}

// =====================================================================
// D. BufferPoolManager integration
// =====================================================================

static void test_bpm_lru_integration() {
    section("BPM + LRU deterministic run (1,2,3,1,4,2,5,1)");
    BufferPoolManager bpm(3, std::make_unique<LRU>());

    std::vector<int> seq = { 1, 2, 3, 1, 4, 2, 5, 1 };
    for (int page : seq) {
        CHECK(bpm.accessPage(page, false) != -1);
    }

    CHECK(bpm.getHits() == 1);
    CHECK(bpm.getMisses() == 7);
    CHECK(bpm.getEvictions() == 4);
    CHECK(bpm.getFrames()[0].getPageId() == 5);
    CHECK(bpm.getFrames()[1].getPageId() == 1);
    CHECK(bpm.getFrames()[2].getPageId() == 2);
    done("test_bpm_lru_integration");
}

static void test_bpm_fifo_integration() {
    section("BPM + FIFO deterministic run (1,2,3,1,4,2,5,1)");
    BufferPoolManager bpm(3, std::make_unique<FIFO>());

    std::vector<int> seq = { 1, 2, 3, 1, 4, 2, 5, 1 };
    for (int page : seq) {
        CHECK(bpm.accessPage(page, false) != -1);
    }

    CHECK(bpm.getHits() == 2);
    CHECK(bpm.getMisses() == 6);
    CHECK(bpm.getEvictions() == 3);
    CHECK(bpm.getFrames()[0].getPageId() == 4);
    CHECK(bpm.getFrames()[1].getPageId() == 5);
    CHECK(bpm.getFrames()[2].getPageId() == 1);
    done("test_bpm_fifo_integration");
}

static void test_bpm_clock_integration() {
    section("BPM + Clock deterministic run (1,2,3,1,4,2,5,1)");
    BufferPoolManager bpm(3, std::make_unique<Clock>());

    std::vector<int> seq = { 1, 2, 3, 1, 4, 2, 5, 1 };
    for (int page : seq) {
        CHECK(bpm.accessPage(page, false) != -1);
    }

    CHECK(bpm.getHits() == 2);
    CHECK(bpm.getMisses() == 6);
    CHECK(bpm.getEvictions() == 3);
    CHECK(bpm.getFrames()[0].getPageId() == 4);
    CHECK(bpm.getFrames()[1].getPageId() == 1);
    CHECK(bpm.getFrames()[2].getPageId() == 5);
    done("test_bpm_clock_integration");
}

static void test_bpm_pinned_protection_all_policies() {
    section("BPM pinned frame protection for all policies");
    auto run = [](std::unique_ptr<ReplacementPolicy> policy) {
        BufferPoolManager bpm(3, std::move(policy));
        bpm.fetchPage(10);
        bpm.fetchPage(20);
        bpm.fetchPage(30);
        bpm.unpinPage(20);
        bpm.unpinPage(30);

        int fNew = bpm.fetchPage(40);
        CHECK(fNew == 1);
        CHECK(bpm.getFrames()[0].getPageId() == 10);
        CHECK(bpm.getFrames()[1].getPageId() == 40);
        CHECK(bpm.getFrames()[2].getPageId() == 30);
    };

    run(std::make_unique<LRU>());
    run(std::make_unique<FIFO>());
    run(std::make_unique<Clock>());
    run(std::make_unique<Optimal>());
    done("test_bpm_pinned_protection_all_policies");
}

static void test_bpm_all_pinned_all_policies() {
    section("BPM all-pinned eviction fails for all policies");
    auto run = [](std::unique_ptr<ReplacementPolicy> policy) {
        BufferPoolManager bpm(2, std::move(policy));
        bpm.fetchPage(1);
        bpm.fetchPage(2);

        CHECK(bpm.fetchPage(3) == -1);
        CHECK(bpm.getFrames()[0].getPageId() == 1);
        CHECK(bpm.getFrames()[1].getPageId() == 2);
    };

    run(std::make_unique<LRU>());
    run(std::make_unique<FIFO>());
    run(std::make_unique<Clock>());
    run(std::make_unique<Optimal>());
    done("test_bpm_all_pinned_all_policies");
}

static void test_bpm_failed_eviction_disk_read_accounting() {
    section("BPM failed eviction does not record disk read");
    MetricsCollector metrics;
    BufferPoolManager bpm(2, std::make_unique<LRU>(), &metrics);

    bpm.fetchPage(1);
    bpm.fetchPage(2);
    CHECK(metrics.getDiskReads() == 2);

    CHECK(bpm.fetchPage(3) == -1);
    CHECK(metrics.getDiskReads() == 2);
    CHECK(metrics.getBufferMisses() == 3);
    CHECK(bpm.getEvictions() == 0);
    done("test_bpm_failed_eviction_disk_read_accounting");
}

static void test_bpm_dirty_page_eviction() {
    section("BPM dirty eviction writes back once");
    MetricsCollector metrics;
    BufferPoolManager bpm(2, std::make_unique<FIFO>(), &metrics);

    bpm.accessPage(1, true);
    bpm.accessPage(2, false);
    bpm.accessPage(3, false);

    CHECK(metrics.getDirtyEvictions() == 1);
    CHECK(metrics.getDiskWrites() == 1);
    CHECK(metrics.getEvictions() == 1);
    CHECK(metrics.getDiskReads() == 3);
    done("test_bpm_dirty_page_eviction");
}

static void test_bpm_repeated_access() {
    section("BPM repeated access of the same page");
    BufferPoolManager bpm(2, std::make_unique<LRU>());

    for (int i = 0; i < 5; ++i) {
        CHECK(bpm.accessPage(7, false) != -1);
    }

    CHECK(bpm.getMisses() == 1);
    CHECK(bpm.getHits() == 4);
    CHECK(bpm.getEvictions() == 0);
    done("test_bpm_repeated_access");
}

static void test_bpm_invalid_inputs() {
    section("BPM invalid configuration and inputs");
    BufferPoolManager bpm(0, std::make_unique<LRU>());
    CHECK(bpm.fetchPage(1) == -1);
    CHECK(bpm.accessPage(-5) == -1);

    BufferPoolManager bpm2(3, std::make_unique<LRU>());
    CHECK(bpm2.fetchPage(-1) == -1);
    CHECK(bpm2.unpinPage(99) == false);
    CHECK(bpm2.flushPage(99) == false);
    bpm2.markDirty(99);
    CHECK(bpm2.getFrames()[0].isDirty() == false);
    done("test_bpm_invalid_inputs");
}

// =====================================================================
// E. VirtualMemoryManager integration
// =====================================================================

static void test_vmm_lru_integration() {
    section("VMM + LRU deterministic run (1,2,3,1,4,2,5,1)");
    VirtualMemoryManager vm(10, 3, std::make_unique<LRU>());

    std::vector<int> seq = { 1, 2, 3, 1, 4, 2, 5, 1 };
    for (int page : seq) {
        CHECK(vm.accessPage(page, false) != -1);
    }

    CHECK(vm.getPageFaults() == 7);
    CHECK(vm.getPageForFrame(0) == 5);
    CHECK(vm.getPageForFrame(1) == 1);
    CHECK(vm.getPageForFrame(2) == 2);
    CHECK(!vm.getPageTable().isPresent(3));
    CHECK(!vm.getPageTable().isPresent(4));
    CHECK(vm.getPageTable().getFrame(5) == 0);
    CHECK(vm.getPageTable().getFrame(1) == 1);
    CHECK(vm.getPageTable().getFrame(2) == 2);
    done("test_vmm_lru_integration");
}

static void test_vmm_fifo_integration() {
    section("VMM + FIFO deterministic run (1,2,3,1,4,2,5,1)");
    VirtualMemoryManager vm(10, 3, std::make_unique<FIFO>());

    std::vector<int> seq = { 1, 2, 3, 1, 4, 2, 5, 1 };
    for (int page : seq) {
        CHECK(vm.accessPage(page, false) != -1);
    }

    CHECK(vm.getPageFaults() == 6);
    CHECK(vm.getPageForFrame(0) == 4);
    CHECK(vm.getPageForFrame(1) == 5);
    CHECK(vm.getPageForFrame(2) == 1);
    CHECK(!vm.getPageTable().isPresent(3));
    CHECK(!vm.getPageTable().isPresent(2));
    CHECK(vm.getPageTable().getFrame(1) == 2);
    done("test_vmm_fifo_integration");
}

static void test_vmm_clock_integration() {
    section("VMM + Clock deterministic run (1,2,3,1,4,2,5,1)");
    VirtualMemoryManager vm(10, 3, std::make_unique<Clock>());

    std::vector<int> seq = { 1, 2, 3, 1, 4, 2, 5, 1 };
    for (int page : seq) {
        CHECK(vm.accessPage(page, false) != -1);
    }

    CHECK(vm.getPageFaults() == 6);
    CHECK(vm.getPageForFrame(0) == 4);
    CHECK(vm.getPageForFrame(1) == 1);
    CHECK(vm.getPageForFrame(2) == 5);
    CHECK(!vm.getPageTable().isPresent(2));
    done("test_vmm_clock_integration");
}

static void test_vmm_invalid_inputs() {
    section("VMM invalid configuration and inputs");
    VirtualMemoryManager vm(0, 0, std::make_unique<LRU>());
    CHECK(vm.accessPage(0) == -1);
    CHECK(vm.accessPage(-1) == -1);

    VirtualMemoryManager vm2(5, 0, std::make_unique<LRU>());
    CHECK(vm2.accessPage(0) == -1);

    VirtualMemoryManager vm3(5, 2, std::make_unique<LRU>());
    CHECK(vm3.accessPage(99) == -1);
    CHECK(vm3.accessPage(-3) == -1);
    done("test_vmm_invalid_inputs");
}

static void test_vmm_repeated_access() {
    section("VMM repeated access of the same page");
    VirtualMemoryManager vm(5, 3, std::make_unique<LRU>());

    for (int i = 0; i < 5; ++i) {
        CHECK(vm.accessPage(3, false) != -1);
    }

    CHECK(vm.getPageFaults() == 1);
    done("test_vmm_repeated_access");
}

// =====================================================================
// G. Optimal (Belady)
// =====================================================================

static void test_opt_initial_state() {
    section("OPT initial state is empty and read-only");
    Optimal opt;
    CHECK(opt.residentCount() == 0);
    CHECK(!opt.isResident(0));
    CHECK(opt.evict() == -1);
    done("test_opt_initial_state");
}

static void test_opt_first_belady_case_evictions() {
    section("OPT lookahead evictions on (1,2,3,1,4,2,5,1)");
    Optimal opt;
    std::vector<int> seq = { 1, 2, 3, 1, 4, 2, 5, 1 };
    opt.setReferenceSequence(seq);

    opt.notifyRequest(1);
    opt.insert(0);
    opt.notifyRequest(2);
    opt.insert(1);
    opt.notifyRequest(3);
    opt.insert(2);

    CHECK(opt.residentCount() == 3);
    CHECK(opt.isResident(0));
    CHECK(opt.isResident(1));
    CHECK(opt.isResident(2));

    opt.notifyRequest(1); // hit, frame 0
    opt.notifyRequest(4); // cursor now at index 4
    CHECK(opt.evict([](int) { return false; }) == -1);
    CHECK(opt.residentCount() == 3); // all-pinned failed evict did not mutate
    CHECK(opt.evict() == 2); // page 3 never used again

    opt.insert(2); // frame 2 now holds page 4
    opt.notifyRequest(2); // hit, frame 1
    opt.notifyRequest(5); // cursor at index 7
    CHECK(opt.evict() == 1); // page 2 vs page 1: tie on never-again, smallest frame

    opt.insert(1); // frame 1 now holds page 5
    opt.notifyRequest(1); // hit, frame 0

    CHECK(opt.isResident(0));
    CHECK(opt.isResident(1));
    CHECK(opt.isResident(2));
    CHECK(opt.residentCount() == 3);
    done("test_opt_first_belady_case_evictions");
}

static void test_opt_duplicate_insert() {
    section("OPT duplicate insertion does not duplicate");
    Optimal opt;
    opt.setReferenceSequence({ 1, 2, 3, 4, 1 });

    opt.notifyRequest(1);
    opt.insert(0);
    opt.insert(0);
    CHECK(opt.residentCount() == 1);

    opt.notifyRequest(2);
    opt.insert(1);
    CHECK(opt.residentCount() == 2);

    CHECK(opt.evict() == 1); // page 2 never used again
    CHECK(opt.evict() == 0); // page 1 used again at index 4, but is last resident
    CHECK(opt.evict() == -1);
    done("test_opt_duplicate_insert");
}

static void test_opt_remove() {
    section("OPT remove is a no-op for absent frames and works for resident ones");
    Optimal opt;
    opt.setReferenceSequence({ 1, 2, 3, 4 });
    opt.notifyRequest(1);
    opt.insert(0);
    opt.remove(42);
    CHECK(opt.residentCount() == 1);

    opt.notifyRequest(2);
    opt.insert(1);
    opt.remove(1);
    CHECK(!opt.isResident(1));
    CHECK(opt.residentCount() == 1);

    opt.notifyRequest(3);
    opt.insert(1);
    opt.notifyRequest(4);
    // Frame 1 holds page 3 (next use index 2), frame 0 holds page 1 (never again)
    CHECK(opt.evict() == 0);
    CHECK(opt.evict() == 1);
    CHECK(opt.evict() == -1);
    done("test_opt_remove");
}

static void test_opt_empty_sequence_fallback() {
    section("OPT empty sequence degrades to deterministic FIFO-like fallback");
    Optimal opt;
    opt.setReferenceSequence({});

    opt.notifyRequest(5);
    opt.insert(0);
    opt.insert(1);

    CHECK(opt.evict() == 0);
    CHECK(opt.evict() == 1);
    CHECK(opt.evict() == -1);
    done("test_opt_empty_sequence_fallback");
}

static void test_opt_one_frame() {
    section("OPT with a single frame capacity");
    Optimal opt;
    opt.setReferenceSequence({ 5, 5, 7 });

    opt.notifyRequest(5);
    opt.insert(0);
    opt.notifyRequest(5); // hit
    opt.notifyRequest(7);
    CHECK(opt.evict() == 0);

    opt.insert(0);
    CHECK(opt.isResident(0));
    CHECK(opt.evict() == 0);
    CHECK(opt.evict() == -1);
    done("test_opt_one_frame");
}

static void test_opt_never_used_again_tie_break() {
    section("OPT never-used-again ties break to the smallest frame id");
    Optimal opt;
    opt.setReferenceSequence({ 1, 2, 3, 4 });

    opt.notifyRequest(1);
    opt.insert(0);
    opt.notifyRequest(2);
    opt.insert(1);
    opt.notifyRequest(3);
    opt.insert(2);
    opt.notifyRequest(4);

    CHECK(opt.evict() == 0);
    CHECK(opt.evict() == 1);
    CHECK(opt.evict() == 2);
    done("test_opt_never_used_again_tie_break");
}

static void test_opt_divergent_requests_fallback() {
    section("OPT requests outside the sequence degrade without corruption");
    Optimal opt;
    opt.setReferenceSequence({ 1, 2, 3 });

    opt.notifyRequest(9); // not in sequence -> fallback mode
    opt.insert(0);
    opt.insert(1);

    CHECK(opt.evict() == 0);
    CHECK(opt.evict() == 1);
    CHECK(opt.evict() == -1);
    done("test_opt_divergent_requests_fallback");
}

static void test_opt_nonresident_access_not_inserted() {
    section("OPT access of non-resident frame does not insert");
    Optimal opt;
    opt.setReferenceSequence({ 1, 2, 3, 1, 4 });
    opt.notifyRequest(1);
    opt.insert(0);
    opt.access(99);

    CHECK(opt.residentCount() == 1);
    CHECK(opt.evict() == 0);
    CHECK(opt.evict() == -1);
    done("test_opt_nonresident_access_not_inserted");
}

// =====================================================================
// H. OPT integration (BufferPoolManager + VirtualMemoryManager)
// =====================================================================

static void test_bpm_opt_integration() {
    section("BPM + OPT deterministic run (1,2,3,1,4,2,5,1)");
    BufferPoolManager bpm(3, std::make_unique<Optimal>());

    std::vector<int> seq = { 1, 2, 3, 1, 4, 2, 5, 1 };
    bpm.setReferenceSequence(seq);
    for (int page : seq) {
        CHECK(bpm.accessPage(page, false) != -1);
    }

    CHECK(bpm.getHits() == 3);
    CHECK(bpm.getMisses() == 5);
    CHECK(bpm.getEvictions() == 2);
    CHECK(bpm.getFrames()[0].getPageId() == 1);
    CHECK(bpm.getFrames()[1].getPageId() == 5);
    CHECK(bpm.getFrames()[2].getPageId() == 4);
    done("test_bpm_opt_integration");
}

static void test_bpm_opt_belady_case1() {
    section("BPM + OPT Belady textbook case 1 (7,0,1,2,0,3,0,4,2,3,0,3,2)");
    BufferPoolManager bpm(3, std::make_unique<Optimal>());

    std::vector<int> seq = { 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2 };
    bpm.setReferenceSequence(seq);
    for (int page : seq) {
        CHECK(bpm.accessPage(page, false) != -1);
    }

    CHECK(bpm.getHits() == 6);
    CHECK(bpm.getMisses() == 7);
    CHECK(bpm.getEvictions() == 4);
    CHECK(bpm.getFrames()[0].getPageId() == 2);
    CHECK(bpm.getFrames()[1].getPageId() == 0);
    CHECK(bpm.getFrames()[2].getPageId() == 3);
    done("test_bpm_opt_belady_case1");
}

static void test_bpm_opt_belady_case2() {
    section("BPM + OPT Belady textbook case 2 (1,2,3,4,1,2,5,1,2,3,4,5)");
    BufferPoolManager bpm(3, std::make_unique<Optimal>());

    std::vector<int> seq = { 1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5 };
    bpm.setReferenceSequence(seq);
    for (int page : seq) {
        CHECK(bpm.accessPage(page, false) != -1);
    }

    CHECK(bpm.getHits() == 5);
    CHECK(bpm.getMisses() == 7);
    CHECK(bpm.getEvictions() == 4);
    CHECK(bpm.getFrames()[0].getPageId() == 4);
    CHECK(bpm.getFrames()[1].getPageId() == 2);
    CHECK(bpm.getFrames()[2].getPageId() == 5);
    done("test_bpm_opt_belady_case2");
}

static void test_vmm_opt_integration() {
    section("VMM + OPT deterministic run (1,2,3,1,4,2,5,1)");
    VirtualMemoryManager vm(10, 3, std::make_unique<Optimal>());

    std::vector<int> seq = { 1, 2, 3, 1, 4, 2, 5, 1 };
    vm.setReferenceSequence(seq);
    for (int page : seq) {
        CHECK(vm.accessPage(page, false) != -1);
    }

    CHECK(vm.getPageFaults() == 5);
    CHECK(vm.getPageForFrame(0) == 1);
    CHECK(vm.getPageForFrame(1) == 5);
    CHECK(vm.getPageForFrame(2) == 4);
    CHECK(vm.getPageTable().getFrame(1) == 0);
    CHECK(vm.getPageTable().getFrame(5) == 1);
    CHECK(vm.getPageTable().getFrame(4) == 2);
    CHECK(!vm.getPageTable().isPresent(2));
    CHECK(!vm.getPageTable().isPresent(3));
    done("test_vmm_opt_integration");
}

static void test_vmm_opt_belady_case1() {
    section("VMM + OPT Belady textbook case 1");
    VirtualMemoryManager vm(10, 3, std::make_unique<Optimal>());

    std::vector<int> seq = { 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2 };
    vm.setReferenceSequence(seq);
    for (int page : seq) {
        CHECK(vm.accessPage(page, false) != -1);
    }

    CHECK(vm.getPageFaults() == 7);
    CHECK(vm.getPageForFrame(0) == 2);
    CHECK(vm.getPageForFrame(1) == 0);
    CHECK(vm.getPageForFrame(2) == 3);
    done("test_vmm_opt_belady_case1");
}

static void test_vmm_opt_belady_case2() {
    section("VMM + OPT Belady textbook case 2");
    VirtualMemoryManager vm(10, 3, std::make_unique<Optimal>());

    std::vector<int> seq = { 1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5 };
    vm.setReferenceSequence(seq);
    for (int page : seq) {
        CHECK(vm.accessPage(page, false) != -1);
    }

    CHECK(vm.getPageFaults() == 7);
    CHECK(vm.getPageForFrame(0) == 4);
    CHECK(vm.getPageForFrame(1) == 2);
    CHECK(vm.getPageForFrame(2) == 5);
    done("test_vmm_opt_belady_case2");
}

static void test_bpm_pinned_protection_opt() {
    section("BPM + OPT respects pinned frames and fallback order");
    BufferPoolManager bpm(3, std::make_unique<Optimal>());
    bpm.setReferenceSequence({ 10, 20, 30, 40, 40 });

    bpm.fetchPage(10);
    bpm.fetchPage(20);
    bpm.fetchPage(30);
    bpm.unpinPage(20);
    bpm.unpinPage(30);

    int fNew = bpm.fetchPage(40);
    CHECK(fNew == 1);
    CHECK(bpm.getFrames()[0].getPageId() == 10);
    CHECK(bpm.getFrames()[1].getPageId() == 40);
    CHECK(bpm.getFrames()[2].getPageId() == 30);

    // Cursor sits on the last 40; frames 1 and 2 both never used again -> frame 1.
    bpm.unpinPage(10);
    CHECK(bpm.accessPage(40, false) == 1);
    done("test_bpm_pinned_protection_opt");
}

static void test_opt_lower_bound_all_algorithms() {
    section("OPT fault count is a lower bound vs LRU/FIFO/Clock");
    std::vector<std::vector<int>> sequences = {
        { 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2 },
        { 1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5 },
        { 1, 2, 3, 1, 4, 2, 5, 1 }
    };

    for (const auto& seq : sequences) {
        for (int frames = 1; frames <= 4; ++frames) {
            auto run = [&](std::unique_ptr<ReplacementPolicy> policy) {
                BufferPoolManager bpm(frames, std::move(policy));
                bpm.setReferenceSequence(seq);
                for (int page : seq) {
                    bpm.accessPage(page, false);
                }
                return bpm.getMisses();
            };

            int optM = run(std::make_unique<Optimal>());
            int lruM = run(std::make_unique<LRU>());
            int fifoM = run(std::make_unique<FIFO>());
            int clockM = run(std::make_unique<Clock>());

            CHECK(optM <= lruM);
            CHECK(optM <= fifoM);
            CHECK(optM <= clockM);
        }
    }
    done("test_opt_lower_bound_all_algorithms");
}

static void test_opt_determinism_repeat() {
    section("OPT produces identical results across repeated runs");
    std::vector<int> seq = { 7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2 };

    auto run = [&seq]() {
        BufferPoolManager bpm(3, std::make_unique<Optimal>());
        bpm.setReferenceSequence(seq);
        for (int page : seq) {
            bpm.accessPage(page, false);
        }
        return std::vector<int>{ bpm.getHits(), bpm.getMisses(), bpm.getEvictions(),
                                 bpm.getFrames()[0].getPageId(),
                                 bpm.getFrames()[1].getPageId(),
                                 bpm.getFrames()[2].getPageId() };
    };

    auto first = run();
    auto second = run();
    CHECK(first == second);
    CHECK(first[0] == 6);
    CHECK(first[1] == 7);
    done("test_opt_determinism_repeat");
}

// =====================================================================
// I. Metrics collector
// =====================================================================

static void test_metrics_zero_requests() {
    section("Metrics zero requests yields safe zero ratios");
    MetricsCollector m;
    CHECK(m.getTotalRequests() == 0);
    CHECK(m.getBufferHits() == 0);
    CHECK(m.getBufferMisses() == 0);
    CHECK(m.getPageFaults() == 0);
    CHECK(m.getBufferHitRatio() == 0.0);
    CHECK(m.getPageFaultRate() == 0.0);
    CHECK(m.getBufferHitPercentage() == 0.0);
    CHECK(m.getPageFaultPercentage() == 0.0);
    done("test_metrics_zero_requests");
}

static void test_metrics_all_hits() {
    section("Metrics all hits: ratio 1.0 (100%)");
    MetricsCollector m;
    for (int i = 0; i < 4; ++i) {
        m.recordRequest();
        m.recordBufferHit();
    }
    CHECK(m.getBufferHitRatio() == 1.0);
    CHECK(m.getBufferHitPercentage() == 100.0);
    CHECK(m.getPageFaultRate() == 0.0);
    done("test_metrics_all_hits");
}

static void test_metrics_all_misses() {
    section("Metrics all misses: hit ratio 0%, fault rate 100%");
    MetricsCollector m;
    for (int i = 0; i < 5; ++i) {
        m.recordRequest();
        m.recordBufferMiss();
        m.recordPageFault();
    }
    CHECK(m.getBufferHitRatio() == 0.0);
    CHECK(m.getBufferHitPercentage() == 0.0);
    CHECK(m.getPageFaultRate() == 1.0);
    CHECK(m.getPageFaultPercentage() == 100.0);
    done("test_metrics_all_misses");
}

static void test_metrics_mixed_and_reset() {
    section("Metrics mixed counters and reset");
    MetricsCollector m;
    // 3 hits, 1 miss of 4 requests
    m.recordRequest(); m.recordBufferHit();
    m.recordRequest(); m.recordBufferHit();
    m.recordRequest(); m.recordBufferMiss();
    m.recordRequest(); m.recordBufferHit();
    CHECK(m.getTotalRequests() == 4);
    CHECK(m.getBufferHits() == 3);
    CHECK(m.getBufferMisses() == 1);
    CHECK(m.getBufferHitRatio() == 0.75);
    CHECK(m.getBufferHitPercentage() == 75.0);

    m.reset();
    CHECK(m.getTotalRequests() == 0);
    CHECK(m.getBufferHits() == 0);
    CHECK(m.getBufferMisses() == 0);
    CHECK(m.getDiskReads() == 0);
    CHECK(m.getDiskWrites() == 0);
    CHECK(m.getEvictions() == 0);
    CHECK(m.getDirtyEvictions() == 0);
    CHECK(m.getBufferHitRatio() == 0.0);
    done("test_metrics_mixed_and_reset");
}

// =====================================================================
// J. Workload generator (canonical Mulberry32 contract)
// =====================================================================

static void test_workload_repeating_type() {
    section("Workload Repeating type: cycle of min(pages, 4)");
    auto seq = WorkloadGenerator::generate(WorkloadType::Repeating, 10, 5, 42);
    CHECK(seq.size() == 10);
    std::vector<int> expected = { 0, 1, 2, 3, 0, 1, 2, 3, 0, 1 };
    CHECK(seq == expected);

    auto seq2 = WorkloadGenerator::generate(WorkloadType::Repeating, 6, 2, 99);
    std::vector<int> expected2 = { 0, 1, 0, 1, 0, 1 };
    CHECK(seq2 == expected2);

    CHECK(WorkloadGenerator::parseType("repeating") == WorkloadType::Repeating);
    CHECK(WorkloadGenerator::parseType("Repeating Pattern") == WorkloadType::Repeating);
    CHECK(WorkloadGenerator::parseType("LOOP") == WorkloadType::Repeating);
    CHECK(WorkloadGenerator::typeToString(WorkloadType::Repeating) == "Repeating");
    done("test_workload_repeating_type");
}

static void test_workload_mulberry32_golden() {
    section("Workload generator matches backend Mulberry32 golden values");
    // Golden values produced by server workload.service.js (Mulberry32).
    CHECK(WorkloadGenerator::generate(WorkloadType::Random, 5, 10, 42) ==
          std::vector<int>({ 6, 4, 8, 6, 1 }));
    CHECK(WorkloadGenerator::generate(WorkloadType::Random, 5, 10, 0) ==
          std::vector<int>({ 2, 0, 2, 1, 4 }));
    CHECK(WorkloadGenerator::generate(WorkloadType::HighLocality, 8, 10, 42) ==
          std::vector<int>({ 0, 7, 1, 1, 5, 1, 0, 1 }));
    CHECK(WorkloadGenerator::generate(WorkloadType::Mixed, 10, 10, 42) ==
          std::vector<int>({ 0, 1, 1, 1, 1, 4, 1, 2, 0, 3 }));
    CHECK(WorkloadGenerator::generate(WorkloadType::Sequential, 6, 3, 0) ==
          std::vector<int>({ 0, 1, 2, 0, 1, 2 }));
    done("test_workload_mulberry32_golden");
}

static void test_workload_single_page_and_invalid() {
    section("Workload pageCount=1 and invalid inputs");
    for (auto type : { WorkloadType::Sequential, WorkloadType::Random,
                       WorkloadType::HighLocality, WorkloadType::Mixed,
                       WorkloadType::Repeating }) {
        auto seq = WorkloadGenerator::generate(type, 7, 1, 42);
        CHECK(seq.size() == 7);
        for (int p : seq) {
            CHECK(p == 0);
        }
    }

    CHECK(WorkloadGenerator::generate(WorkloadType::Random, 0, 10).empty());
    CHECK(WorkloadGenerator::generate(WorkloadType::Random, 10, 0).empty());
    CHECK(WorkloadGenerator::generate(WorkloadType::Random, -3, 10).empty());
    done("test_workload_single_page_and_invalid");
}

static void test_workload_page_range() {
    section("Workload all types stay within [0, pageCount)");
    for (auto type : { WorkloadType::Sequential, WorkloadType::Random,
                       WorkloadType::HighLocality, WorkloadType::Mixed,
                       WorkloadType::Repeating }) {
        auto seq = WorkloadGenerator::generate(type, 200, 7, 1234);
        CHECK(seq.size() == 200);
        for (int p : seq) {
            CHECK(p >= 0 && p < 7);
        }
    }
    done("test_workload_page_range");
}

static void test_workload_seed_variation() {
    section("Workload different seeds produce different random sequences");
    auto s1 = WorkloadGenerator::generate(WorkloadType::Random, 50, 10, 1);
    auto s2 = WorkloadGenerator::generate(WorkloadType::Random, 50, 10, 2);
    bool differs = false;
    for (size_t i = 0; i < s1.size(); ++i) {
        if (s1[i] != s2[i]) {
            differs = true;
            break;
        }
    }
    CHECK(differs);
    done("test_workload_seed_variation");
}

// =====================================================================
// K. Write ratio / deterministic write mask
// =====================================================================

static void test_write_mask_zero_and_full() {
    section("Write mask 0% and 100%");
    auto none = WorkloadGenerator::writeMask(50, 0, 42);
    CHECK(none.size() == 50);
    for (bool w : none) {
        CHECK(!w);
    }

    auto all = WorkloadGenerator::writeMask(50, 100, 42);
    CHECK(all.size() == 50);
    for (bool w : all) {
        CHECK(w);
    }

    CHECK(WorkloadGenerator::writeMask(0, 50, 42).empty());
    CHECK(WorkloadGenerator::writeMask(-1, 50, 42).empty());
    done("test_write_mask_zero_and_full");
}

static void test_write_mask_ratio_accuracy() {
    section("Write mask approximate ratio accuracy");
    auto half = WorkloadGenerator::writeMask(1000, 50, 42);
    CHECK(half.size() == 1000);
    int writes = 0;
    for (bool w : half) {
        if (w) writes++;
    }
    // Exactly 50% +/- 5% for a seeded uniform stream
    CHECK(writes >= 450 && writes <= 550);

    auto tenth = WorkloadGenerator::writeMask(1000, 10, 7);
    int writes10 = 0;
    for (bool w : tenth) {
        if (w) writes10++;
    }
    CHECK(writes10 >= 50 && writes10 <= 150);
    done("test_write_mask_ratio_accuracy");
}

static void test_write_mask_determinism_and_seed_variation() {
    section("Write mask determinism and seed sensitivity");
    auto a1 = WorkloadGenerator::writeMask(200, 30, 42);
    auto a2 = WorkloadGenerator::writeMask(200, 30, 42);
    CHECK(a1 == a2);

    auto s1 = WorkloadGenerator::writeMask(200, 30, 1);
    auto s2 = WorkloadGenerator::writeMask(200, 30, 2);
    bool differs = false;
    for (size_t i = 0; i < s1.size(); ++i) {
        if (s1[i] != s2[i]) {
            differs = true;
            break;
        }
    }
    CHECK(differs);
    done("test_write_mask_determinism_and_seed_variation");
}

// =====================================================================
// L. Write-operation behavior (dirty pages)
// =====================================================================

static void test_bpm_write_dirty_lifecycle() {
    section("BPM write requests create dirty pages and dirty evictions");
    MetricsCollector metrics;
    BufferPoolManager bpm(2, std::make_unique<FIFO>(), &metrics);

    bpm.accessPage(1, true);  // write: page 1 dirty in frame 0
    bpm.accessPage(2, false); // clean load
    CHECK(bpm.getFrames()[0].isDirty());

    bpm.accessPage(3, false); // evicts dirty page 1 -> write-back
    CHECK(metrics.getDirtyEvictions() == 1);
    CHECK(metrics.getDiskWrites() == 1);
    CHECK(!bpm.getFrames()[0].isDirty()); // flag reset after write-back
    CHECK(bpm.getFrames()[0].getPageId() == 3);

    bpm.accessPage(4, false); // evicts clean page 2 -> no write-back
    CHECK(metrics.getDirtyEvictions() == 1);
    CHECK(metrics.getDiskWrites() == 1);
    CHECK(metrics.getEvictions() == 2);
    done("test_bpm_write_dirty_lifecycle");
}

static void test_bpm_write_then_read_stays_dirty() {
    section("BPM read after write does not clear the dirty flag");
    MetricsCollector metrics;
    BufferPoolManager bpm(2, std::make_unique<LRU>(), &metrics);

    bpm.accessPage(1, true);
    bpm.accessPage(1, false); // read hit must not clear dirty
    CHECK(bpm.getFrames()[0].isDirty());

    bpm.accessPage(2, false);
    bpm.accessPage(3, false); // evicts dirty page 1 (LRU) -> write-back
    CHECK(metrics.getDirtyEvictions() == 1);
    done("test_bpm_write_then_read_stays_dirty");
}

static void test_bpm_pinned_dirty_frame_not_evicted() {
    section("BPM pinned dirty frame is never evicted");
    BufferPoolManager bpm(2, std::make_unique<LRU>());

    bpm.fetchPage(1);       // pins frame 0
    bpm.unpinPage(1, true); // dirty, but now unpinned
    bpm.fetchPage(2);       // pins frame 1
    bpm.unpinPage(2, false);

    bpm.fetchPage(1); // pin dirty frame 0 again (still resident)

    // Eviction must skip pinned dirty frame 0 and take frame 1.
    CHECK(bpm.fetchPage(3) == 1);
    CHECK(bpm.getFrames()[0].getPageId() == 1);
    CHECK(bpm.getFrames()[0].isDirty());
    CHECK(bpm.getFrames()[1].getPageId() == 3);
    done("test_bpm_pinned_dirty_frame_not_evicted");
}

static void test_vmm_write_dirty_lifecycle() {
    section("VMM write requests mark page table dirty and write back on eviction");
    MetricsCollector metrics;
    VirtualMemoryManager vm(10, 2, std::make_unique<FIFO>(), &metrics);

    vm.accessPage(1, true);
    CHECK(vm.getPageTable().isDirty(1));
    vm.accessPage(2, false);
    CHECK(!vm.getPageTable().isDirty(2));

    vm.accessPage(3, false); // evicts dirty page 1
    CHECK(metrics.getDirtyEvictions() == 1);
    CHECK(metrics.getDiskWrites() == 1);
    CHECK(!vm.getPageTable().isPresent(1)); // PTE invalidated
    CHECK(vm.getPageTable().isDirty(2) == false);

    vm.accessPage(4, false); // evicts clean page 2
    CHECK(metrics.getDirtyEvictions() == 1);
    CHECK(metrics.getDiskWrites() == 1);
    CHECK(!vm.getPageTable().isPresent(2));
    done("test_vmm_write_dirty_lifecycle");
}

static void test_vmm_read_only_no_dirty_evictions() {
    section("VMM read-only workload produces no dirty evictions");
    MetricsCollector metrics;
    VirtualMemoryManager vm(10, 2, std::make_unique<LRU>(), &metrics);

    std::vector<int> seq = { 1, 2, 3, 4, 5, 6 };
    for (int page : seq) {
        CHECK(vm.accessPage(page, false) != -1);
    }

    CHECK(metrics.getDirtyEvictions() == 0);
    CHECK(metrics.getDiskWrites() == 0);
    CHECK(vm.getPageFaults() == 6);
    done("test_vmm_read_only_no_dirty_evictions");
}

// =====================================================================
// M. Workload generator
// =====================================================================

static void test_workload_generator_deterministic() {
    section("Workload generator determinism and bounds");
    auto seq1 = WorkloadGenerator::generate(WorkloadType::Random, 20, 10, 12345);
    auto seq2 = WorkloadGenerator::generate(WorkloadType::Random, 20, 10, 12345);
    CHECK(seq1 == seq2);

    auto highLoc = WorkloadGenerator::generate(WorkloadType::HighLocality, 100, 10, 42);
    CHECK(highLoc.size() == 100);
    for (int p : highLoc) {
        CHECK(p >= 0 && p < 10);
    }

    auto emptyWorkload = WorkloadGenerator::generate(WorkloadType::Random, 0, 10);
    CHECK(emptyWorkload.empty());
    done("test_workload_generator_deterministic");
}

int main() {
    std::printf("MemorySim Engine Tests\n");

    test_lru_basic_eviction();
    test_lru_access_changes_order();
    test_lru_duplicate_insert();
    test_lru_remove();
    test_lru_nonresident_access_not_inserted();
    test_lru_pinned_skip();
    test_lru_all_pinned();

    test_fifo_basic_eviction();
    test_fifo_access_ignores_recency();
    test_fifo_duplicate_insert();
    test_fifo_remove();
    test_fifo_pinned_skip();
    test_fifo_all_pinned();

    test_clock_initial_state();
    test_clock_sweep_clears_bits();
    test_clock_second_chance_spared();
    test_clock_hand_advancement();
    test_clock_remove_and_reinsert();
    test_clock_pinned_skip();
    test_clock_all_pinned_no_mutation();
    test_clock_nonresident_access_regression();
    test_clock_remove_nonresident();

    test_bpm_lru_integration();
    test_bpm_fifo_integration();
    test_bpm_clock_integration();
    test_bpm_pinned_protection_all_policies();
    test_bpm_all_pinned_all_policies();
    test_bpm_failed_eviction_disk_read_accounting();
    test_bpm_dirty_page_eviction();
    test_bpm_repeated_access();
    test_bpm_invalid_inputs();

    test_vmm_lru_integration();
    test_vmm_fifo_integration();
    test_vmm_clock_integration();
    test_vmm_invalid_inputs();
    test_vmm_repeated_access();

    test_opt_initial_state();
    test_opt_first_belady_case_evictions();
    test_opt_duplicate_insert();
    test_opt_remove();
    test_opt_empty_sequence_fallback();
    test_opt_one_frame();
    test_opt_never_used_again_tie_break();
    test_opt_divergent_requests_fallback();
    test_opt_nonresident_access_not_inserted();

    test_bpm_opt_integration();
    test_bpm_opt_belady_case1();
    test_bpm_opt_belady_case2();
    test_vmm_opt_integration();
    test_vmm_opt_belady_case1();
    test_vmm_opt_belady_case2();
    test_bpm_pinned_protection_opt();
    test_opt_lower_bound_all_algorithms();
    test_opt_determinism_repeat();

    test_workload_generator_deterministic();

    test_metrics_zero_requests();
    test_metrics_all_hits();
    test_metrics_all_misses();
    test_metrics_mixed_and_reset();

    test_workload_repeating_type();
    test_workload_mulberry32_golden();
    test_workload_single_page_and_invalid();
    test_workload_page_range();
    test_workload_seed_variation();

    test_write_mask_zero_and_full();
    test_write_mask_ratio_accuracy();
    test_write_mask_determinism_and_seed_variation();

    test_bpm_write_dirty_lifecycle();
    test_bpm_write_then_read_stays_dirty();
    test_bpm_pinned_dirty_frame_not_evicted();
    test_vmm_write_dirty_lifecycle();
    test_vmm_read_only_no_dirty_evictions();

    std::printf("\n%d checks, %d failed\n", checksRun, checksFailed);
    if (checksFailed == 0) {
        std::printf("ALL TESTS PASSED\n");
        return 0;
    }

    return 1;
}
