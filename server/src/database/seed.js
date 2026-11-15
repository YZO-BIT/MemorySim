import mongoose from "mongoose";
import dotenv from "dotenv";

import Page from "../models/Page.js";
import Experiment from "../models/Experiment.js";
import Workload from "../models/Workload.js";
import SimulationEvent from "../models/SimulationEvent.js";

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("Connected to MongoDB Atlas");

    // Clear existing sample data
    await Page.deleteMany({});
    await Experiment.deleteMany({});
    await Workload.deleteMany({});
    await SimulationEvent.deleteMany({});

    // ==========================================
    // 1. PAGES
    // ==========================================

    const pages = await Page.insertMany([
      {
        pageId: 0,
        pageType: "virtual",
        size: 4096,
        data: "Page 0",
        present: true,
        physicalFrame: 0,
        dirty: false,
        referenced: true
      },
      {
        pageId: 1,
        pageType: "virtual",
        size: 4096,
        data: "Page 1",
        present: true,
        physicalFrame: 1,
        dirty: false,
        referenced: true
      },
      {
        pageId: 2,
        pageType: "virtual",
        size: 4096,
        data: "Page 2",
        present: true,
        physicalFrame: 2,
        dirty: true,
        referenced: true
      },
      {
        pageId: 3,
        pageType: "virtual",
        size: 4096,
        data: "Page 3",
        present: false,
        physicalFrame: -1,
        dirty: false,
        referenced: false
      },
      {
        pageId: 4,
        pageType: "virtual",
        size: 4096,
        data: "Page 4",
        present: false,
        physicalFrame: -1,
        dirty: false,
        referenced: false
      }
    ]);

    console.log(`Inserted ${pages.length} pages`);

    // ==========================================
    // 2. WORKLOAD
    // ==========================================

    const workload = await Workload.create({
      name: "Sample Locality Workload",
      type: "High Locality",
      pageCount: 5,
      requests: [
        0,
        1,
        2,
        0,
        1,
        3,
        0,
        2,
        4,
        1
      ]
    });

    console.log("Inserted workload");

    // ==========================================
    // 3. EXPERIMENT
    // ==========================================

    const experiment = await Experiment.create({
      algorithm: "LRU",

      bufferSize: 3,
      virtualFrames: 5,
      physicalFrames: 3,
      pageSize: 4096,

      workloadType: "High Locality",
      totalRequests: 10,

      // Reproducibility data
      seed: 42,
      writeRatio: 0,
      referenceSequence: [0, 1, 2, 0, 1, 3, 0, 2, 4, 1],

      // Percentages are stored consistently app-wide (0-100 scale)
      bufferHits: 4,
      bufferMisses: 6,
      bufferHitRatio: 40.0,
      bufferDiskReads: 6,
      bufferDiskWrites: 1,
      bufferEvictions: 3,
      bufferDirtyEvictions: 1,

      pageFaults: 6,
      pageFaultRate: 60.0,
      vmDiskReads: 6,
      vmDiskWrites: 1,
      vmEvictions: 3,
      vmDirtyEvictions: 1,

      diskReads: 6,
      diskWrites: 1,

      evictions: 3,
      dirtyEvictions: 1,

      executionTimeMs: 2.45
    });

    console.log("Inserted experiment");

    // ==========================================
    // 4. SIMULATION EVENTS
    // ==========================================

    const events = [
      {
        experimentId: experiment._id,
        stepNumber: 1,
        requestPage: 0,
        event: "PAGE_FAULT",
        bufferState: [0]
      },

      {
        experimentId: experiment._id,
        stepNumber: 1,
        requestPage: 0,
        event: "PAGE_LOAD",
        bufferState: [0]
      },

      {
        experimentId: experiment._id,
        stepNumber: 2,
        requestPage: 1,
        event: "PAGE_FAULT",
        bufferState: [0, 1]
      },

      {
        experimentId: experiment._id,
        stepNumber: 3,
        requestPage: 2,
        event: "PAGE_FAULT",
        bufferState: [0, 1, 2]
      },

      {
        experimentId: experiment._id,
        stepNumber: 4,
        requestPage: 0,
        event: "BUFFER_HIT",
        bufferState: [1, 2, 0]
      },

      {
        experimentId: experiment._id,
        stepNumber: 5,
        requestPage: 1,
        event: "BUFFER_HIT",
        bufferState: [2, 0, 1]
      },

      {
        experimentId: experiment._id,
        stepNumber: 6,
        requestPage: 3,
        event: "BUFFER_MISS",
        bufferState: [2, 0, 1]
      },

      {
        experimentId: experiment._id,
        stepNumber: 6,
        requestPage: 3,
        event: "PAGE_EVICT",
        bufferState: [2, 0, 3]
      },

      {
        experimentId: experiment._id,
        stepNumber: 6,
        requestPage: 3,
        event: "PAGE_LOAD",
        bufferState: [2, 0, 3]
      },

      {
        experimentId: experiment._id,
        stepNumber: 7,
        requestPage: 4,
        event: "BUFFER_MISS",
        bufferState: [2, 0, 3]
      }
    ];

    const insertedEvents = await SimulationEvent.insertMany(events);

    console.log(`Inserted ${insertedEvents.length} simulation events`);

    console.log("\n================================");
    console.log("DATABASE SEEDED SUCCESSFULLY");
    console.log("================================");

    await mongoose.connection.close();

  } catch (error) {
    console.error("Seed error:", error.message);
    process.exit(1);
  }
};

seedDatabase();