import mongoose from "mongoose";

const ExperimentSchema = new mongoose.Schema(
  {
    algorithm: {
      type: String,
      enum: ["LRU", "FIFO", "CLOCK"],
      required: true,
    },

    bufferSize: Number,
    virtualFrames: Number,
    physicalFrames: Number,
    pageSize: Number,

    workloadType: String,

    totalRequests: Number,

    bufferHits: Number,
    bufferMisses: Number,
    bufferHitRatio: Number,

    pageFaults: Number,
    pageFaultRate: Number,

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