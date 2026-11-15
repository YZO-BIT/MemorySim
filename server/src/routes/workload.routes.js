import express from "express";
import { generateWorkload } from "../services/workload.service.js";

const router = express.Router();

const KNOWN_TYPES = ["random", "repeating", "repeat", "loop", "sequential", "highlocality", "locality", "mixed"];
const MAX_REQUESTS = 100000;
const MAX_PAGES = 100000;

function normalizeType(type) {
  return String(type || "").toLowerCase().replace(/[\s_-]/g, "");
}

router.get("/types", (req, res) => {
  res.json({
    success: true,
    types: ["Random", "Repeating", "Sequential", "High Locality", "Mixed"],
  });
});

router.post("/generate", (req, res) => {
  const body = req.body || {};
  const { type = "Random", totalRequests = 10, pageCount = 10, seed = 42 } = body;

  if (!KNOWN_TYPES.includes(normalizeType(type))) {
    return res.status(400).json({
      success: false,
      message: `Invalid workload type '${type}'. Must be one of: Random, Repeating, Sequential, High Locality, Mixed.`,
    });
  }

  const parsedCount = parseInt(totalRequests, 10);
  if (Number.isNaN(parsedCount) || parsedCount < 1 || parsedCount > MAX_REQUESTS) {
    return res.status(400).json({
      success: false,
      message: `totalRequests must be an integer between 1 and ${MAX_REQUESTS}.`,
    });
  }

  const parsedPages = parseInt(pageCount, 10);
  if (Number.isNaN(parsedPages) || parsedPages < 1 || parsedPages > MAX_PAGES) {
    return res.status(400).json({
      success: false,
      message: `pageCount must be an integer between 1 and ${MAX_PAGES}.`,
    });
  }

  if (seed !== undefined && seed !== null && seed !== "") {
    const parsedSeed = parseInt(seed, 10);
    if (Number.isNaN(parsedSeed) || String(parsedSeed) !== String(seed).trim()) {
      return res.status(400).json({
        success: false,
        message: "seed must be an integer (0 is valid).",
      });
    }
  }

  const requests = generateWorkload({
    type,
    totalRequests: parsedCount,
    pageCount: parsedPages,
    seed,
  });

  res.json({
    success: true,
    type,
    totalRequests: requests.length,
    requests,
  });
});

export default router;
