cmake_minimum_required(VERSION 3.16)

project(MemorySimulator)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(include)

add_executable(simulator

    src/main.cpp

    src/buffer/BufferPoolManager.cpp

    src/memory/PageTable.cpp
    src/memory/VirtualMemoryManager.cpp

    src/replacement/LRU.cpp
    src/replacement/FIFO.cpp
    src/replacement/Clock.cpp

    src/metrics/MetricsCollector.cpp
    src/workload/WorkloadGenerator.cpp
)