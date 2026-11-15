import express from "express";
import { getExperiments, getExperimentById } from "../controllers/experiment.controller.js";

const router = express.Router();

router.get("/", getExperiments);
router.get("/:id", getExperimentById);

export default router;
