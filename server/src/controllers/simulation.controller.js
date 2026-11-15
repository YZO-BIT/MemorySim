import { executeSimulation } from "../services/simulator.service.js";
import { generateWorkload } from "../services/workload.service.js";
import Experiment from "../models/Experiment.js";
import SimulationEvent from "../models/SimulationEvent.js";
import { isDbConnected } from "../database/mongodb.js";
import {
  validateSimulationInput,
  buildEventRecords,
} from "../services/simulation-validation.service.js";

// Events are capped at 200 per experiment to prevent massive inserts; the
// full reference sequence and all step records live in the engine response.
const MAX_PERSISTED_EVENTS = 200;

const ALGORITHMS = ["LRU", "FIFO", "Clock", "OPT"];

export const runSimulation = async (req, res) => {
  try {
    const validation = validateSimulationInput(req.body);
    if (!validation.ok) {
      return res.status(validation.status).json({
        success: false,
        message: validation.message,
      });
    }
    const input = validation.value;

    // Generate the canonical reference sequence once (deterministic
    // Mulberry32, identical to the engine implementation) and pass that
    // exact sequence to the engine.
    let finalRequests = input.requests;
    if (!Array.isArray(finalRequests)) {
      finalRequests = generateWorkload({
        type: input.workloadType,
        totalRequests: input.totalRequests,
        pageCount: input.virtualPages,
        seed: input.seed,
      });
    }

    // Execute through C++ engine
    const engineResult = await executeSimulation({
      algorithm: input.algorithm,
      bufferPoolSize: input.bufferPoolSize,
      virtualPages: input.virtualPages,
      physicalFrames: input.physicalFrames,
      pageSize: input.pageSize,
      workloadType: input.workloadType,
      totalRequests: finalRequests.length,
      requests: finalRequests,
      seed: input.seed,
      writeRatio: input.writeRatio,
    });

    let persisted = false;
    let experimentId = null;

    // Optional MongoDB persistence if database is connected
    if (isDbConnected()) {
      try {
        const m = engineResult.metrics;
        const experimentDoc = await Experiment.create({
          algorithm: engineResult.config.algorithm.toUpperCase(),
          bufferSize: engineResult.config.bufferPoolSize,
          virtualFrames: engineResult.config.virtualPages,
          physicalFrames: engineResult.config.physicalFrames,
          pageSize: engineResult.config.pageSize,
          workloadType: engineResult.config.workloadType,
          totalRequests: m.totalRequests,
          seed: input.seed,
          writeRatio: input.writeRatio,
          // Exact original reference sequence for historical replay
          referenceSequence: finalRequests,

          // Buffer-pool layer metrics
          bufferHits: m.bufferHits,
          bufferMisses: m.bufferMisses,
          bufferHitRatio: m.bufferHitRatio,
          bufferDiskReads: m.bufferDiskReads ?? 0,
          bufferDiskWrites: m.bufferDiskWrites ?? 0,
          bufferEvictions: m.bufferEvictions ?? 0,
          bufferDirtyEvictions: m.bufferDirtyEvictions ?? 0,

          // Virtual-memory layer metrics
          pageFaults: m.pageFaults,
          pageFaultRate: m.pageFaultRate,
          vmDiskReads: m.vmDiskReads ?? 0,
          vmDiskWrites: m.vmDiskWrites ?? 0,
          vmEvictions: m.vmEvictions ?? 0,
          vmDirtyEvictions: m.vmDirtyEvictions ?? 0,

          // Legacy combined counters kept for backward compatibility
          diskReads: m.diskReads,
          diskWrites: m.diskWrites,
          evictions: m.evictions,
          dirtyEvictions: m.dirtyEvictions,

          executionTimeMs: m.executionTimeMs,
        });

        experimentId = experimentDoc._id;
        persisted = true;

        // Persist events if feasible (capped); each event carries the
        // correct step-level state via buildEventRecords.
        const eventRecords = buildEventRecords(
          engineResult,
          experimentDoc._id,
          MAX_PERSISTED_EVENTS
        );
        if (eventRecords.length > 0) {
          await SimulationEvent.insertMany(eventRecords);
        }
      } catch (dbError) {
        console.warn("[Database] Could not persist experiment:", dbError.message);
        persisted = false;
      }
    }

    return res.json({
      success: true,
      persisted,
      experimentId,
      ...engineResult,
    });
  } catch (error) {
    console.error("[Simulation Controller Error]:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to execute simulation.",
    });
  }
};

export const compareSimulation = async (req, res) => {
  try {
    const validation = validateSimulationInput(req.body, { requireAlgorithm: false });
    if (!validation.ok) {
      return res.status(validation.status).json({
        success: false,
        message: validation.message,
      });
    }
    const input = validation.value;

    let finalRequests = input.requests;
    if (!Array.isArray(finalRequests)) {
      finalRequests = generateWorkload({
        type: input.workloadType,
        totalRequests: input.totalRequests,
        pageCount: input.virtualPages,
        seed: input.seed,
      });
    }

    const results = await Promise.all(
      ALGORITHMS.map((algo) =>
        executeSimulation({
          algorithm: algo,
          bufferPoolSize: input.bufferPoolSize,
          virtualPages: input.virtualPages,
          physicalFrames: input.physicalFrames,
          pageSize: input.pageSize,
          workloadType: input.workloadType,
          totalRequests: finalRequests.length,
          requests: finalRequests,
          seed: input.seed,
          writeRatio: input.writeRatio,
        })
      )
    );

    // Buffer-pool layer metrics and virtual-memory layer metrics are kept
    // separate; no counters are combined across layers.
    const summary = results.map((res) => ({
      algorithm: res.config.algorithm,
      hits: res.metrics.bufferHits,
      misses: res.metrics.bufferMisses,
      hitRatio: res.metrics.bufferHitRatio,
      missRatio: res.metrics.bufferMissRatio,
      bufferDiskReads: res.metrics.bufferDiskReads ?? 0,
      bufferEvictions: res.metrics.bufferEvictions ?? 0,
      bufferDirtyEvictions: res.metrics.bufferDirtyEvictions ?? 0,
      vmHits: res.metrics.vmHits ?? 0,
      pageFaults: res.metrics.pageFaults,
      pageFaultRate: res.metrics.pageFaultRate,
      vmEvictions: res.metrics.vmEvictions ?? 0,
      vmDirtyEvictions: res.metrics.vmDirtyEvictions ?? 0,
      writeRatio: res.metrics.writeRatio ?? input.writeRatio,
      executionTimeMs: res.metrics.executionTimeMs,
    }));

    // Find best algorithm (lowest buffer-pool misses)
    let minMisses = Infinity;
    let best = [];
    for (const item of summary) {
      if (item.misses < minMisses) {
        minMisses = item.misses;
        best = [item.algorithm];
      } else if (item.misses === minMisses) {
        best.push(item.algorithm);
      }
    }

    return res.json({
      success: true,
      sequence: finalRequests,
      frames: input.bufferPoolSize,
      writeRatio: input.writeRatio,
      seed: input.seed,
      summary,
      results: {
        LRU: results[0],
        FIFO: results[1],
        Clock: results[2],
        OPT: results[3],
      },
      bestAlgorithms: best,
    });
  } catch (error) {
    console.error("[Simulation Compare Error]:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to execute algorithm comparison.",
    });
  }
};
