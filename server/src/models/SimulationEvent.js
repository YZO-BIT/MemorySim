import mongoose from "mongoose";

const SimulationEventSchema = new mongoose.Schema(
  {
    experimentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Experiment",
    },

    requestPage: Number,

    event: {
      type: String,
      enum: [
        "BUFFER_HIT",
        "BUFFER_MISS",
        "PAGE_FETCH",
        "PAGE_EVICT",
        "PAGE_FAULT",
        "PAGE_LOAD",
        "DISK_READ",
        "DISK_WRITE",
        "PAGE_DIRTY",
        "PAGE_PIN",
        "PAGE_UNPIN",
      ],
    },

    bufferState: [Number],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "SimulationEvent",
  SimulationEventSchema
);