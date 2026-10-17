import express from "express";
import { runSimulation, compareSimulation } from "../controllers/simulation.controller.js";

const router = express.Router();

// POST /api/simulation/run
router.post("/run", runSimulation);

// POST /api/simulation/compare
router.post("/compare", compareSimulation);

export default router;
