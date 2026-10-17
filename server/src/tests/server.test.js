import test from "node:test";
import assert from "node:assert";
import { generateWorkload } from "../services/workload.service.js";
import { executeSimulation, getEngineBinaryPath } from "../services/simulator.service.js";

test("Workload Generator - Sequential produces correct stride", () => {
  const reqs = generateWorkload({
    type: "Sequential",
    totalRequests: 8,
    pageCount: 3,
  });
  assert.strictEqual(reqs.length, 8);
  assert.deepStrictEqual(reqs, [0, 1, 2, 0, 1, 2, 0, 1]);
});

test("Workload Generator - Random is deterministic with same seed", () => {
  const seq1 = generateWorkload({ type: "Random", totalRequests: 15, pageCount: 10, seed: 99 });
  const seq2 = generateWorkload({ type: "Random", totalRequests: 15, pageCount: 10, seed: 99 });
  assert.strictEqual(seq1.length, 15);
  assert.deepStrictEqual(seq1, seq2);
});

test("Workload Generator - High Locality adheres to bounds", () => {
  const reqs = generateWorkload({ type: "High Locality", totalRequests: 50, pageCount: 5, seed: 42 });
  assert.strictEqual(reqs.length, 50);
  for (const p of reqs) {
    assert.ok(p >= 0 && p < 5);
  }
});

test("Simulator Service - Can locate compiled C++ engine executable", () => {
  const binary = getEngineBinaryPath();
  assert.ok(binary, "Engine binary must exist and be discovered");
});

test("Simulator Service - Executes C++ engine and returns valid simulation JSON", async () => {
  const result = await executeSimulation({
    algorithm: "LRU",
    bufferPoolSize: 3,
    virtualPages: 10,
    physicalFrames: 3,
    requests: [1, 2, 3, 1, 4, 2, 5, 1],
  });

  assert.ok(result);
  assert.strictEqual(result.config.algorithm, "LRU");
  assert.strictEqual(result.config.bufferPoolSize, 3);
  assert.strictEqual(result.metrics.totalRequests, 8);
  assert.strictEqual(result.bufferPool.length, 3);
  assert.ok(Array.isArray(result.events));
  assert.ok(result.events.length > 0);
  assert.ok(result.metrics.bufferHits >= 1);
  assert.ok(result.metrics.evictions >= 1);
});

test("Simulator Service - Different algorithms yield correct victim metrics", async () => {
  const lruRes = await executeSimulation({
    algorithm: "LRU",
    bufferPoolSize: 3,
    requests: [1, 2, 3, 1, 4, 2, 5, 1],
  });

  const fifoRes = await executeSimulation({
    algorithm: "FIFO",
    bufferPoolSize: 3,
    requests: [1, 2, 3, 1, 4, 2, 5, 1],
  });

  assert.strictEqual(lruRes.metrics.bufferHits, 1);
  assert.strictEqual(fifoRes.metrics.bufferHits, 2);
});
