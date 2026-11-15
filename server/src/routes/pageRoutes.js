import express from "express";
import Page from "../models/Page.js";
import { isDbConnected } from "../database/mongodb.js";

const router = express.Router();

const generatePageData = (id) => {
  const names = ["Alice", "Bob", "Charlie", "Diana", "Evan", "Fiona", "George", "Hannah", "Ian", "Julia", "Kevin", "Laura", "Mike", "Nina", "Oscar"];
  const name = names[id % names.length];
  const balance = 100 + ((id * 73) % 900); 
  return `Customer #${id}: ${name} (Balance: $${balance})`;
};

router.get("/", async (req, res) => {
  const maxPages = Math.max(10, parseInt(req.query.count, 10) || 10);

  if (!isDbConnected()) {
    const offlinePages = Array.from({ length: maxPages }, (_, i) => ({
      pageId: i,
      data: generatePageData(i),
    }));
    return res.json({ success: true, dbConnected: false, data: offlinePages });
  }

  try {
    let pages = await Page.find().sort({ pageId: 1 });

    if (pages.length < maxPages) {
      const existingIds = new Set(pages.map((p) => p.pageId));
      const toInsert = [];
      for (let i = 0; i < maxPages; i++) {
        if (!existingIds.has(i)) {
          toInsert.push({
            pageId: i,
            pageType: "virtual",
            data: generatePageData(i),
            dirty: false,
          });
        }
      }
      if (toInsert.length > 0) {
        await Page.insertMany(toInsert);
        pages = await Page.find().sort({ pageId: 1 });
      }
    }

    res.json({ success: true, dbConnected: true, data: pages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/sync-state", async (req, res) => {
  const { frames = [] } = req.body || {};

  if (!isDbConnected()) {
    return res.json({ success: true, dbConnected: false });
  }

  if (!Array.isArray(frames)) {
    return res.status(400).json({
      success: false,
      message: "frames must be an array.",
    });
  }

  try {
    // Clear current frame placement, leaving disk data and dirty status alone.
    await Page.updateMany(
      { pageType: "virtual" },
      { $set: { present: false, physicalFrame: -1 } }
    );

    const updates = frames
      .filter((frame) => frame.pageId !== null && frame.pageId !== undefined)
      .map((frame) =>
        Page.updateOne(
          { pageId: Number(frame.pageId), pageType: "virtual" },
          {
            $set: {
              present: true,
              physicalFrame: Number(frame.frameId),
            },
            $setOnInsert: {
              pageId: Number(frame.pageId),
              pageType: "virtual",
            },
          },
          { upsert: true }
        )
      );

    await Promise.all(updates);
    res.json({ success: true, dbConnected: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/writeback", async (req, res) => {
  const { pageId, data } = req.body;
  const numId = parseInt(pageId, 10);
  const pageContent = data || generatePageData(numId);

  if (!isDbConnected()) {
    return res.json({
      success: true,
      dbConnected: false,
      message: `Offline mode: Simulated write-back for Page ${numId}.`,
      data: { pageId: numId, data: pageContent, dirty: false },
    });
  }

  try {
    const updated = await Page.findOneAndUpdate(
      { pageId: numId },
      { data: pageContent, dirty: false, pageType: "virtual" },
      { new: true, upsert: true } 
    );
    res.json({ success: true, dbConnected: true, page: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/reset", async (req, res) => {
  const count = Math.max(10, parseInt(req.body.count, 10) || 10);

  if (!isDbConnected()) {
    return res.json({ success: true, dbConnected: false });
  }

  try {
    await Page.deleteMany({});
    const initialPages = Array.from({ length: count }, (_, i) => ({
      pageId: i,
      pageType: "virtual",
      data: generatePageData(i),
      dirty: false,
    }));
    const pages = await Page.insertMany(initialPages);
    res.json({ success: true, dbConnected: true, data: pages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;