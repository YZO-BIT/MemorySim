import express from "express";
import {
  getExperiments,
  getExperimentById,
  deleteExperimentById,
  clearAllExperiments,
} from "../controllers/experiment.controller.js";

const router = express.Router();

router.get("/", getExperiments);
router.delete("/", clearAllExperiments);
router.get("/:id", getExperimentById);
router.delete("/:id", deleteExperimentById);

export default router;