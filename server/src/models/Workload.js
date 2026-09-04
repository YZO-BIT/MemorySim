import mongoose from "mongoose";

const workloadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },

    type: {
      type: String,
      enum: ["Random", "Sequential", "High Locality", "Mixed"],
      required: true
    },

    pageCount: {
      type: Number,
      required: true
    },

    requests: {
      type: [Number],
      required: true
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Workload", workloadSchema);