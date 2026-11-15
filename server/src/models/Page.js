import mongoose from "mongoose";

const pageSchema = new mongoose.Schema(
  {
    pageId: {
      type: Number,
      required: true
    },

    pageType: {
      type: String,
      enum: ["virtual", "buffer"],
      required: true
    },

    size: {
      type: Number,
      default: 4096
    },

    data: {
      type: String,
      default: ""
    },

    present: {
      type: Boolean,
      default: false
    },

    physicalFrame: {
      type: Number,
      default: -1
    },

    dirty: {
      type: Boolean,
      default: false
    },

    referenced: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.model("Page", pageSchema);