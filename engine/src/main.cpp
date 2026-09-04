#include <iostream>
#include <memory>
#include <vector>

#include "buffer/BufferPoolManager.hpp"
#include "memory/VirtualMemoryManager.hpp"
#include "replacement/LRU.hpp"
#include "replacement/FIFO.hpp"
#include "replacement/Clock.hpp"

void runSimulation(
    const std::string& algorithm
) {
    std::cout << "\n";
    std::cout << "==============================\n";
    std::cout << algorithm << " SIMULATION\n";
    std::cout << "==============================\n";

    std::unique_ptr<ReplacementPolicy> policy;

    if (algorithm == "LRU") {
        policy = std::make_unique<LRU>();
    }
    else if (algorithm == "FIFO") {
        policy = std::make_unique<FIFO>();
    }
    else {
        policy = std::make_unique<Clock>();
    }

    BufferPoolManager bufferPool(
        3,
        std::move(policy)
    );

    std::vector<int> requests = {
        1, 2, 3, 1, 4, 2, 5, 1
    };

    for (int page : requests) {

        int frame = bufferPool.fetchPage(page);

        std::cout
            << "Request Page "
            << page
            << " -> Frame "
            << frame
            << "\n";
    }

    std::cout << "\n";

    std::cout
        << "Buffer Hits: "
        << bufferPool.getHits()
        << "\n";

    std::cout
        << "Buffer Misses: "
        << bufferPool.getMisses()
        << "\n";

    std::cout
        << "Evictions: "
        << bufferPool.getEvictions()
        << "\n";
}

void runVirtualMemorySimulation() {

    std::cout << "\n";
    std::cout << "==============================\n";
    std::cout << "VIRTUAL MEMORY SIMULATION\n";
    std::cout << "==============================\n";

    VirtualMemoryManager vm(
        10,
        3
    );

    std::vector<int> requests = {
        0, 1, 2, 0, 3, 1, 4
    };

    for (int page : requests) {

        int frame =
            vm.accessPage(page);

        std::cout
            << "Virtual Page "
            << page
            << " -> Physical Frame "
            << frame
            << "\n";
    }

    std::cout
        << "\nPage Faults: "
        << vm.getPageFaults()
        << "\n";
}

int main() {

    runSimulation("LRU");

    runSimulation("FIFO");

    runSimulation("Clock");

    runVirtualMemorySimulation();

    return 0;
}