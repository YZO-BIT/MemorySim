import express from "express";
import { runSimulation, compareSimulation } from "../controllers/simulation.controller.js";

const router = express.Router();

router.post("/run", runSimulation);

router.post("/compare", compareSimulation);

export default router;
