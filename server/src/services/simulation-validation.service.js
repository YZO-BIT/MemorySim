/**
 * Shared input validation and persistence helpers for simulation endpoints.
 * Used by both /api/simulation/run and /api/simulation/compare so the
 * comparison endpoint can never bypass limits enforced on normal runs.
 */

const LIMITS = {
  bufferPoolSize: { min: 1, max: 10000, label: "bufferPoolSize" },
  physicalFrames: { min: 1, max: 10000, label: "physicalFrames" },
  virtualPages: { min: 1, max: 100000, label: "virtualPages" },
  pageSize: { min: 256, max: 1048576, label: "pageSize" },
  totalRequests: { min: 1, max: 100000, label: "totalRequests" },
};

const SUPPORTED_ALGORITHMS = ["LRU", "FIFO", "Clock", "CLOCK", "OPT", "OPTIMAL"];
const SUPPORTED_WORKLOADS = ["Random", "Repeating", "Sequential", "High Locality", "Mixed"];

function parseIntStrict(value) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }
  if (typeof value !== "string" && typeof value !== "number") {
    return NaN;
  }
  const str = String(value).trim();
  if (!/^-?\d+$/.test(str)) {
    return NaN;
  }
  return parseInt(str, 10);
}

function checkBoundedInt(body, field) {
  const limit = LIMITS[field];
  const raw = body?.[field];
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: undefined };
  }
  const parsed = parseIntStrict(raw);
  if (Number.isNaN(parsed)) {
    return { ok: false, message: `${limit.label} must be an integer.` };
  }
  if (parsed < limit.min || parsed > limit.max) {
    return {
      ok: false,
      message: `${limit.label} must be an integer between ${limit.min} and ${limit.max}.`,
    };
  }
  return { ok: true, value: parsed };
}

/**
 * Validates and normalizes a simulation request body.
 * Returns { ok: true, value } or { ok: false, status, message }.
 */
export function validateSimulationInput(body, { requireAlgorithm = true } = {}) {
  const b = body || {};

  let algorithm = "LRU";
  if (requireAlgorithm) {
    const rawAlgo = (b.algorithm ?? "LRU").toString().trim();
    const match = SUPPORTED_ALGORITHMS.find((a) => a.toLowerCase() === rawAlgo.toLowerCase());
    if (!match) {
      return {
        ok: false,
        status: 400,
        message: `Invalid algorithm '${b.algorithm}'. Must be one of: LRU, FIFO, Clock, OPT.`,
      };
    }
    algorithm = match === "CLOCK" ? "Clock" : match === "OPTIMAL" ? "OPT" : match;
  }

  const fields = {};
  for (const field of Object.keys(LIMITS)) {
    const result = checkBoundedInt(b, field);
    if (!result.ok) {
      return { ok: false, status: 400, message: result.message };
    }
    fields[field] = result.value;
  }

  // Seed: 0 is a valid seed and must never be silently replaced.
  let seed = 42;
  if (b.seed !== undefined && b.seed !== null && b.seed !== "") {
    const parsedSeed = parseIntStrict(b.seed);
    if (Number.isNaN(parsedSeed)) {
      return { ok: false, status: 400, message: "seed must be an integer." };
    }
    // Preserve the full integer range; the engine wraps modulo 2^32 exactly
    // like the Mulberry32 generator in workload.service.js.
    seed = parsedSeed;
  }

  // Write ratio: percentage 0-100. Default 0 keeps read-only behavior.
  let writeRatio = 0;
  if (b.writeRatio !== undefined && b.writeRatio !== null && b.writeRatio !== "") {
    const raw = Number(b.writeRatio);
    if (!Number.isFinite(raw)) {
      return { ok: false, status: 400, message: "writeRatio must be a number between 0 and 100." };
    }
    writeRatio = raw;
    if (writeRatio < 0 || writeRatio > 100) {
      return {
        ok: false,
        status: 400,
        message: "writeRatio must be a number between 0 and 100 (percentage of write requests).",
      };
    }
  }

  // Explicit reference sequence: bounded count, valid integers, within the
  // configured virtual page range. A present-but-empty or non-array requests
  // field is rejected instead of silently falling back to workload generation.
  let requests = null;
  if (b.requests !== undefined && b.requests !== null) {
    if (!Array.isArray(b.requests)) {
      return {
        ok: false,
        status: 400,
        message: "requests must be an array of integer page identifiers.",
      };
    }
    if (b.requests.length === 0) {
      return {
        ok: false,
        status: 400,
        message: "requests must not be empty; omit the field to generate a workload.",
      };
    }
    if (b.requests.length > LIMITS.totalRequests.max) {
      return {
        ok: false,
        status: 400,
        message: `requests length must not exceed ${LIMITS.totalRequests.max}.`,
      };
    }
    const vPages = fields.virtualPages ?? 10;
    for (let i = 0; i < b.requests.length; i++) {
      const page = b.requests[i];
      const parsed = parseIntStrict(page);
      if (Number.isNaN(parsed)) {
        return {
          ok: false,
          status: 400,
          message: `requests[${i}] is not a valid integer page identifier.`,
        };
      }
      if (parsed < 0) {
        return {
          ok: false,
          status: 400,
          message: `requests[${i}] = ${parsed} is negative; page identifiers must be non-negative.`,
        };
      }
      if (parsed >= vPages) {
        return {
          ok: false,
          status: 400,
          message: `requests[${i}] = ${parsed} is outside the configured virtual page range (0-${vPages - 1}).`,
        };
      }
    }
    requests = b.requests.map((p) => parseIntStrict(p));
  }

  const totalRequests = fields.totalRequests ?? 10;
  if (requests === null && (totalRequests < 1 || totalRequests > LIMITS.totalRequests.max)) {
    return {
      ok: false,
      status: 400,
      message: `totalRequests must be an integer between 1 and ${LIMITS.totalRequests.max}.`,
    };
  }

  let workloadType = b.workloadType;
  if (workloadType !== undefined && workloadType !== null && workloadType !== "") {
    const normalized = String(workloadType).trim();
    const match = SUPPORTED_WORKLOADS.find((w) => w.toLowerCase() === normalized.toLowerCase());
    if (!match) {
      workloadType = normalized;
    } else {
      workloadType = match;
    }
  } else {
    workloadType = "Random";
  }

  return {
    ok: true,
    value: {
      algorithm,
      bufferPoolSize: fields.bufferPoolSize ?? 3,
      virtualPages: fields.virtualPages ?? 10,
      physicalFrames: fields.physicalFrames ?? 3,
      pageSize: fields.pageSize ?? 4096,
      workloadType,
      totalRequests: requests ? requests.length : totalRequests,
      requests,
      seed,
      writeRatio,
    },
  };
}

/**
 * Builds step-accurate event records for persistence. Each event is mapped to
 * its originating step (via the "Step N" time field) so requestPage and
 * bufferState reflect the state at that step, not the final state.
 */
export function buildEventRecords(engineResult, experimentId, maxEvents = 200) {
  if (!Array.isArray(engineResult?.events) || engineResult.events.length === 0) {
    return [];
  }

  const stepsByNumber = new Map();
  for (const step of engineResult.steps || []) {
    if (step && Number.isInteger(step.step)) {
      stepsByNumber.set(step.step, step);
    }
  }

  return engineResult.events.slice(0, maxEvents).map((ev) => {
    const stepMatch = typeof ev.time === "string" ? ev.time.match(/Step\s+(\d+)/i) : null;
    const stepNumber = stepMatch ? parseInt(stepMatch[1], 10) : null;
    const step = stepNumber !== null ? stepsByNumber.get(stepNumber) : null;

    return {
      experimentId,
      stepNumber,
      requestPage: step ? step.requestedPage : 0,
      event: ev.type,
      bufferState: step
        ? (step.frames || []).map((f) => f.pageId).filter((p) => p !== null)
        : [],
    };
  });
}
