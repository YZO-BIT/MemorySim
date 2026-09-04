export const mockSimulation = {
  config: {
    databasePages: 1000,
    bufferPoolSize: 3,
    virtualPages: 10,
    physicalFrames: 4,
    pageSize: 4096,
    algorithm: "LRU",
    workloadType: "Random",
    totalRequests: 10000,
  },

  bufferPool: [
    {
      frameId: 0,
      pageId: 42,
      dirty: true,
      pinCount: 0,
    },
    {
      frameId: 1,
      pageId: 17,
      dirty: false,
      pinCount: 0,
    },
    {
      frameId: 2,
      pageId: 91,
      dirty: true,
      pinCount: 1,
    },
  ],

  virtualMemory: [
    { virtualPage: 0, physicalFrame: 2, present: true, dirty: false },
    { virtualPage: 1, physicalFrame: 0, present: true, dirty: true },
    { virtualPage: 2, physicalFrame: 1, present: true, dirty: false },
    { virtualPage: 3, physicalFrame: null, present: false, dirty: false },
    { virtualPage: 4, physicalFrame: 3, present: true, dirty: true },
    { virtualPage: 5, physicalFrame: null, present: false, dirty: false },
  ],

  metrics: {
    totalRequests: 10000,
    bufferHits: 7234,
    bufferMisses: 2766,
    bufferHitRatio: 72.34,
    pageFaults: 831,
    pageFaultRate: 8.31,
    diskReads: 2766,
    diskWrites: 412,
    evictions: 2766,
    dirtyEvictions: 412,
    executionTimeMs: 142.8,
  },

  events: [
    {
      time: "10:31:01",
      type: "BUFFER_HIT",
      message: "Page 42 → Buffer Hit",
    },
    {
      time: "10:31:02",
      type: "BUFFER_MISS",
      message: "Page 91 → Buffer Miss",
    },
    {
      time: "10:31:02",
      type: "EVICTION",
      message: "LRU → Evict Page 17",
    },
    {
      time: "10:31:02",
      type: "PAGE_FETCH",
      message: "Page 91 → Loaded into Buffer",
    },
    {
      time: "10:31:03",
      type: "PAGE_FAULT",
      message: "Virtual Page 7 → Page Fault",
    },
    {
      time: "10:31:03",
      type: "PAGE_LOAD",
      message: "Virtual Page 7 → Loaded into Frame 1",
    },
  ],
};