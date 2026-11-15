cmake_minimum_required(VERSION 3.16)

project(MemorySimulator)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(include)

set(ENGINE_SOURCES
    src/buffer/BufferPoolManager.cpp

    src/memory/PageTable.cpp
    src/memory/VirtualMemoryManager.cpp

    src/replacement/LRU.cpp
    src/replacement/FIFO.cpp
    src/replacement/Clock.cpp
    src/replacement/Optimal.cpp

    src/metrics/MetricsCollector.cpp
    src/workload/WorkloadGenerator.cpp
)

add_executable(simulator
    src/main.cpp
    ${ENGINE_SOURCES}
)

enable_testing()

add_executable(engine_tests
    tests/engine_test.cpp
    ${ENGINE_SOURCES}
)

add_test(NAME engine_tests COMMAND engine_tests)
