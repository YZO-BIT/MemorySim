import { executeSimulation } from "../services/simulator.service.js";
import { generateWorkload } from "../services/workload.service.js";
import Experiment from "../models/Experiment.js";
import SimulationEvent from "../models/SimulationEvent.js";
import { isDbConnected } from "../database/mongodb.js";

const VALID_ALGORITHMS = ["LRU", "FIFO", "Clock", "CLOCK"];
const VALID_WORKLOADS = ["Random", "Repeating", "Sequential", "High Locality", "Mixed"];

export const runSimulation = async (req, res) => {
  try {
    const {
      algorithm = "LRU",
      bufferPoolSize = 3,
      virtualPages = 10,
      physicalFrames = 3,
      pageSize = 4096,
      workloadType = "Random",
      totalRequests = 10,
      requests,
      seed = 42,
    } = req.body || {};

    const normalizedAlgo = (algorithm || "").trim();
    if (!VALID_ALGORITHMS.some((a) => a.toLowerCase() === normalizedAlgo.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid algorithm '${algorithm}'. Must be one of: LRU, FIFO, Clock.`,
      });
    }

    const bpSize = parseInt(bufferPoolSize, 10);
    if (isNaN(bpSize) || bpSize < 1 || bpSize > 10000) {
      return res.status(400).json({
        success: false,
        message: "bufferPoolSize must be an integer between 1 and 10000.",
      });
    }

    const vPages = parseInt(virtualPages, 10);
    if (isNaN(vPages) || vPages < 1 || vPages > 100000) {
      return res.status(400).json({
        success: false,
        message: "virtualPages must be an integer between 1 and 100000.",
      });
    }

    const pFrames = parseInt(physicalFrames, 10);
    if (isNaN(pFrames) || pFrames < 1 || pFrames > 10000) {
      return res.status(400).json({
        success: false,
        message: "physicalFrames must be an integer between 1 and 10000.",
      });
    }

    const reqCount = parseInt(totalRequests, 10);
    if (isNaN(reqCount) || reqCount < 1 || reqCount > 100000) {
      return res.status(400).json({
        success: false,
        message: "totalRequests must be an integer between 1 and 100000.",
      });
    }

    let finalRequests = requests;
    if (!Array.isArray(finalRequests) || finalRequests.length === 0) {
      finalRequests = generateWorkload({
        type: workloadType,
        totalRequests: reqCount,
        pageCount: vPages,
        seed: parseInt(seed, 10) || 42,
      });
    }

    const engineResult = await executeSimulation({
      algorithm: normalizedAlgo,
      bufferPoolSize: bpSize,
      virtualPages: vPages,
      physicalFrames: pFrames,
      pageSize: parseInt(pageSize, 10) || 4096,
      workloadType,
      totalRequests: finalRequests.length,
      requests: finalRequests,
      seed: parseInt(seed, 10) || 42,
    });

    let persisted = false;
    let experimentId = null;

    if (isDbConnected()) {
      try {
        const experimentDoc = await Experiment.create({
          algorithm: engineResult.config.algorithm.toUpperCase(),
          bufferSize: engineResult.config.bufferPoolSize,
          virtualFrames: engineResult.config.virtualPages,
          physicalFrames: engineResult.config.physicalFrames,
          pageSize: engineResult.config.pageSize,
          workloadType: engineResult.config.workloadType,
          totalRequests: engineResult.metrics.totalRequests,
          bufferHits: engineResult.metrics.bufferHits,
          bufferMisses: engineResult.metrics.bufferMisses,
          bufferHitRatio: engineResult.metrics.bufferHitRatio,
          pageFaults: engineResult.metrics.pageFaults,
          pageFaultRate: engineResult.metrics.pageFaultRate,
          diskReads: engineResult.metrics.diskReads,
          diskWrites: engineResult.metrics.diskWrites,
          evictions: engineResult.metrics.evictions,
          dirtyEvictions: engineResult.metrics.dirtyEvictions,
          executionTimeMs: engineResult.metrics.executionTimeMs,
        });

        experimentId = experimentDoc._id;
        persisted = true;

        if (Array.isArray(engineResult.events) && engineResult.events.length > 0) {
          const eventsToPersist = engineResult.events.slice(0, 200).map((ev) => ({
            experimentId: experimentDoc._id,
            requestPage: parseInt((ev.message.match(/Page\s+(\d+)/i) || [])[1], 10) || 0,
            event: ev.type,
            bufferState: engineResult.bufferPool.map((b) => b.pageId).filter((p) => p !== null),
          }));
          await SimulationEvent.insertMany(eventsToPersist);
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
    const {
      bufferPoolSize = 3,
      virtualPages = 10,
      physicalFrames = 3,
      pageSize = 4096,
      workloadType = "Random",
      totalRequests = 10,
      requests,
      seed = 42,
    } = req.body || {};

    const bpSize = Math.max(1, parseInt(bufferPoolSize, 10) || 3);
    const vPages = Math.max(1, parseInt(virtualPages, 10) || 10);
    const pFrames = Math.max(1, parseInt(physicalFrames, 10) || 3);
    const reqCount = Math.max(1, parseInt(totalRequests, 10) || 10);

    let finalRequests = requests;
    if (!Array.isArray(finalRequests) || finalRequests.length === 0) {
      finalRequests = generateWorkload({
        type: workloadType,
        totalRequests: reqCount,
        pageCount: vPages,
        seed: parseInt(seed, 10) || 42,
      });
    }

    const algorithms = ["LRU", "FIFO", "Clock"];
    const results = await Promise.all(
      algorithms.map((algo) =>
        executeSimulation({
          algorithm: algo,
          bufferPoolSize: bpSize,
          virtualPages: vPages,
          physicalFrames: pFrames,
          pageSize: parseInt(pageSize, 10) || 4096,
          workloadType,
          totalRequests: finalRequests.length,
          requests: finalRequests,
          seed: parseInt(seed, 10) || 42,
        })
      )
    );

    const summary = results.map((res) => ({
      algorithm: res.config.algorithm,
      hits: res.metrics.bufferHits,
      misses: res.metrics.bufferMisses,
      pageFaults: res.metrics.pageFaults,
      hitRatio: res.metrics.bufferHitRatio,
      pageFaultRate: res.metrics.pageFaultRate,
      evictions: res.metrics.evictions,
      executionTimeMs: res.metrics.executionTimeMs,
    }));

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
      frames: bpSize,
      summary,
      results: {
        LRU: results[0],
        FIFO: results[1],
        Clock: results[2],
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
