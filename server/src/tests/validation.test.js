import test from "node:test";
import assert from "node:assert";
import {
  validateSimulationInput,
  buildEventRecords,
} from "../services/simulation-validation.service.js";

test("Validation - seed 0 is a valid seed and is preserved", () => {
  const result = validateSimulationInput({ algorithm: "LRU", seed: 0, requests: [1, 2] });
  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.value.seed, 0);
});

test("Validation - default seed is 42, non-integer seeds are rejected", () => {
  const defaulted = validateSimulationInput({ algorithm: "LRU", requests: [1] });
  assert.strictEqual(defaulted.value.seed, 42);

  const invalid = validateSimulationInput({ algorithm: "LRU", seed: "abc", requests: [1] });
  assert.strictEqual(invalid.ok, false);
  assert.ok(invalid.message.includes("seed"));
});

test("Validation - algorithm names are case-insensitive and canonicalized", () => {
  assert.strictEqual(validateSimulationInput({ algorithm: "lru" }).value.algorithm, "LRU");
  assert.strictEqual(validateSimulationInput({ algorithm: "clock" }).value.algorithm, "Clock");
  assert.strictEqual(validateSimulationInput({ algorithm: "optimal" }).value.algorithm, "OPT");
  assert.strictEqual(validateSimulationInput({ algorithm: "OPT" }).value.algorithm, "OPT");

  const bad = validateSimulationInput({ algorithm: "Belady" });
  assert.strictEqual(bad.ok, false);
  assert.strictEqual(bad.status, 400);
});

test("Validation - write ratio bounds and defaults", () => {
  assert.strictEqual(validateSimulationInput({ requests: [1] }).value.writeRatio, 0);
  assert.strictEqual(validateSimulationInput({ requests: [1], writeRatio: 30 }).value.writeRatio, 30);

  const tooHigh = validateSimulationInput({ requests: [1], writeRatio: 101 });
  assert.strictEqual(tooHigh.ok, false);
  assert.ok(tooHigh.message.includes("writeRatio"));

  const negative = validateSimulationInput({ requests: [1], writeRatio: -5 });
  assert.strictEqual(negative.ok, false);

  const notANumber = validateSimulationInput({ requests: [1], writeRatio: "fast" });
  assert.strictEqual(notANumber.ok, false);
});

test("Validation - request sequences are bounded, integer, and in range", () => {
  const outOfRange = validateSimulationInput({ virtualPages: 5, requests: [1, 2, 9] });
  assert.strictEqual(outOfRange.ok, false);
  assert.ok(outOfRange.message.includes("virtual page range"));

  const negative = validateSimulationInput({ virtualPages: 5, requests: [1, -2] });
  assert.strictEqual(negative.ok, false);
  assert.ok(negative.message.includes("non-negative"));

  const nonInteger = validateSimulationInput({ virtualPages: 5, requests: [1, 2.5] });
  assert.strictEqual(nonInteger.ok, false);
  assert.ok(nonInteger.message.includes("not a valid integer"));

  const tooLong = validateSimulationInput({
    virtualPages: 5,
    requests: new Array(100001).fill(0),
  });
  assert.strictEqual(tooLong.ok, false);
  assert.ok(tooLong.message.includes("must not exceed"));

  const valid = validateSimulationInput({ virtualPages: 5, requests: [0, 1, 2, 3, 4] });
  assert.strictEqual(valid.ok, true);
  assert.deepStrictEqual(valid.value.requests, [0, 1, 2, 3, 4]);
  assert.strictEqual(valid.value.totalRequests, 5);
});

test("Validation - size bounds match /run limits for /compare", () => {
  const clamped = validateSimulationInput({ bufferPoolSize: 999999, requests: [1] }, {
    requireAlgorithm: false,
  });
  assert.strictEqual(clamped.ok, false);
  assert.ok(clamped.message.includes("bufferPoolSize"));
});

test("Validation - bounded integers reject non-integers", () => {
  const bad = validateSimulationInput({ bufferPoolSize: "three", requests: [1] });
  assert.strictEqual(bad.ok, false);
  assert.ok(bad.message.includes("integer"));
});

test("buildEventRecords - events map to their correct step state", () => {
  const engineResult = {
    events: [
      { time: "Step 1", type: "BUFFER_MISS", message: "x" },
      { time: "Step 1", type: "PAGE_FETCH", message: "x" },
      { time: "Step 2", type: "PAGE_EVICT", message: "x" },
      { time: "Step 3", type: "PAGE_FAULT", message: "x" },
    ],
    steps: [
      {
        step: 1,
        requestedPage: 7,
        frames: [
          { frameId: 0, pageId: 7 },
          { frameId: 1, pageId: null },
        ],
      },
      {
        step: 2,
        requestedPage: 2,
        frames: [
          { frameId: 0, pageId: 2 },
          { frameId: 1, pageId: null },
        ],
      },
      {
        step: 3,
        requestedPage: 4,
        frames: [
          { frameId: 0, pageId: 2 },
          { frameId: 1, pageId: 4 },
        ],
      },
    ],
  };

  const records = buildEventRecords(engineResult, "exp123", 200);

  assert.strictEqual(records.length, 4);
  assert.strictEqual(records[0].experimentId, "exp123");
  assert.strictEqual(records[0].stepNumber, 1);
  assert.strictEqual(records[0].requestPage, 7);
  assert.deepStrictEqual(records[0].bufferState, [7]);

  // PAGE_EVICT must carry the requested page, not the evicted page
  assert.strictEqual(records[2].stepNumber, 2);
  assert.strictEqual(records[2].requestPage, 2);
  assert.deepStrictEqual(records[2].bufferState, [2]);

  assert.strictEqual(records[3].stepNumber, 3);
  assert.strictEqual(records[3].requestPage, 4);
  assert.deepStrictEqual(records[3].bufferState, [2, 4]);
});

test("buildEventRecords - caps events and handles unknown steps", () => {
  const engineResult = {
    events: Array.from({ length: 250 }, (_, i) => ({ time: "Step 1", type: "BUFFER_HIT" })),
    steps: [],
  };

  const records = buildEventRecords(engineResult, "exp", 200);
  assert.strictEqual(records.length, 200);
  assert.strictEqual(records[0].requestPage, 0);
  assert.deepStrictEqual(records[0].bufferState, []);
});

test("buildEventRecords - empty events produce no records", () => {
  assert.deepStrictEqual(buildEventRecords({ events: [] }, "exp"), []);
  assert.deepStrictEqual(buildEventRecords({}, "exp"), []);
});
