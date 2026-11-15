import mongoose from "mongoose";

const ExperimentSchema = new mongoose.Schema(
  {
    algorithm: {
      type: String,
      enum: ["LRU", "FIFO", "CLOCK", "OPT"],
      required: true,
    },

    bufferSize: Number,
    virtualFrames: Number,
    physicalFrames: Number,
    pageSize: Number,

    workloadType: String,

    // Reproducibility data for historical replay
    seed: Number,
    writeRatio: Number,
    referenceSequence: [Number],

    totalRequests: Number,

    // Buffer-pool layer metrics
    bufferHits: Number,
    bufferMisses: Number,
    bufferHitRatio: Number,
    bufferDiskReads: Number,
    bufferDiskWrites: Number,
    bufferEvictions: Number,
    bufferDirtyEvictions: Number,

    // Virtual-memory layer metrics
    pageFaults: Number,
    pageFaultRate: Number,
    vmDiskReads: Number,
    vmDiskWrites: Number,
    vmEvictions: Number,
    vmDirtyEvictions: Number,

    // Legacy combined counters (kept for backward compatibility)
    diskReads: Number,
    diskWrites: Number,

    evictions: Number,
    dirtyEvictions: Number,

    executionTimeMs: Number,
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Experiment", ExperimentSchema);