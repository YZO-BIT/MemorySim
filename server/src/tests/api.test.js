import test from "node:test";
import assert from "node:assert";
import http from "node:http";
import app from "../server.js";

let server;
let baseUrl;

test.before(() => {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

test.after(() => {
  return new Promise((resolve) => {
    server.close(resolve);
  });
});

test("API: GET /api/status returns engine availability", async () => {
  const res = await fetch(`${baseUrl}/api/status`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.status, "ok");
  assert.strictEqual(data.engineAvailable, true);
});

test("API: POST /api/simulation/run executes C++ simulation and returns valid results", async () => {
  const payload = {
    algorithm: "LRU",
    bufferPoolSize: 3,
    virtualPages: 10,
    physicalFrames: 3,
    workloadType: "Random",
    totalRequests: 8,
    requests: [1, 2, 3, 1, 4, 2, 5, 1],
  };

  const res = await fetch(`${baseUrl}/api/simulation/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.config.algorithm, "LRU");
  assert.strictEqual(data.bufferPool.length, 3);
  assert.ok(data.metrics.bufferHits >= 1);
  assert.ok(data.events.length > 0);
});

test("API: POST /api/simulation/run rejects invalid algorithm with 400", async () => {
  const res = await fetch(`${baseUrl}/api/simulation/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ algorithm: "INVALID_ALGO" }),
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(data.message.includes("Invalid algorithm"));
});

test("API: POST /api/simulation/run rejects negative bufferPoolSize with 400", async () => {
  const res = await fetch(`${baseUrl}/api/simulation/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ algorithm: "LRU", bufferPoolSize: -5 }),
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(data.message.includes("bufferPoolSize"));
});

test("API: POST /api/workload/generate returns synthetic sequence", async () => {
  const res = await fetch(`${baseUrl}/api/workload/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "Sequential", totalRequests: 6, pageCount: 3 }),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.deepStrictEqual(data.requests, [0, 1, 2, 0, 1, 2]);
});

test("API: GET /api/experiments handles offline database gracefully", async () => {
  const res = await fetch(`${baseUrl}/api/experiments`);
  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.ok(Array.isArray(data.data));
});

test("API: POST /api/simulation/compare runs comparison across LRU, FIFO, Clock, OPT", async () => {
  const res = await fetch(`${baseUrl}/api/simulation/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bufferPoolSize: 3,
      requests: [1, 2, 3, 1, 4, 2, 5, 1],
    }),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.summary.length, 4);
  assert.ok(data.results.LRU);
  assert.ok(data.results.FIFO);
  assert.ok(data.results.Clock);
  assert.ok(data.results.OPT);
  assert.ok(Array.isArray(data.bestAlgorithms));

  // OPT is the theoretical lower bound for buffer-pool misses
  const opt = data.summary.find((s) => s.algorithm === "OPT");
  const lru = data.summary.find((s) => s.algorithm === "LRU");
  const fifo = data.summary.find((s) => s.algorithm === "FIFO");
  const clock = data.summary.find((s) => s.algorithm === "Clock");
  assert.ok(opt.misses <= lru.misses && opt.misses <= fifo.misses && opt.misses <= clock.misses);
});

test("API: seed 0 is preserved and never silently replaced", async () => {
  const res = await fetch(`${baseUrl}/api/simulation/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      algorithm: "LRU",
      bufferPoolSize: 3,
      virtualPages: 10,
      seed: 0,
      requests: [1, 2, 3, 1, 4, 2, 5, 1],
    }),
  });

  assert.strictEqual(res.status, 200);
  const data = await res.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.config.seed, 0);
});

test("API: write ratio is validated and forwarded to the engine", async () => {
  const ok = await fetch(`${baseUrl}/api/simulation/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      algorithm: "LRU",
      bufferPoolSize: 3,
      virtualPages: 10,
      writeRatio: 50,
      requests: [1, 2, 3, 4, 5, 6, 7, 8],
    }),
  });

  assert.strictEqual(ok.status, 200);
  const data = await ok.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.config.writeRatio, 50);
  assert.strictEqual(data.metrics.writeRatio, 50);
  assert.ok(Array.isArray(data.steps));
  assert.ok(data.steps.every((s) => typeof s.isWrite === "boolean"));

  const invalid = await fetch(`${baseUrl}/api/simulation/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      algorithm: "LRU",
      bufferPoolSize: 3,
      virtualPages: 10,
      writeRatio: 150,
      requests: [1, 2, 3],
    }),
  });
  assert.strictEqual(invalid.status, 400);
  const invalidData = await invalid.json();
  assert.strictEqual(invalidData.success, false);
  assert.ok(invalidData.message.includes("writeRatio"));
});

test("API: out-of-range request pages are rejected with 400", async () => {
  const res = await fetch(`${baseUrl}/api/simulation/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      algorithm: "LRU",
      bufferPoolSize: 3,
      virtualPages: 5,
      requests: [1, 2, 9],
    }),
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(data.message.includes("virtual page range"));
});

test("API: compare endpoint cannot bypass limits enforced on /run", async () => {
  const res = await fetch(`${baseUrl}/api/simulation/compare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bufferPoolSize: 999999,
      requests: [1, 2, 3],
    }),
  });

  assert.strictEqual(res.status, 400);
  const data = await res.json();
  assert.strictEqual(data.success, false);
  assert.ok(data.message.includes("bufferPoolSize"));
});

