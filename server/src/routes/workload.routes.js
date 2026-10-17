import express from "express";
import { generateWorkload } from "../services/workload.service.js";

const router = express.Router();

router.get("/types", (req, res) => {
  res.json({
    success: true,
    types: ["Random", "Sequential", "High Locality", "Mixed"],
  });
});

router.post("/generate", (req, res) => {
  const { type = "Random", totalRequests = 10, pageCount = 10, seed = 42 } = req.body || {};

  const requests = generateWorkload({
    type,
    totalRequests,
    pageCount,
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
