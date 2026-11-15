import Experiment from "../models/Experiment.js";
import SimulationEvent from "../models/SimulationEvent.js";
import { isDbConnected } from "../database/mongodb.js";

export const getExperiments = async (req, res) => {
  if (!isDbConnected()) {
    return res.json({
      success: true,
      dbConnected: false,
      message: "Database is offline. Historical experiments unavailable.",
      data: [],
    });
  }

  try {
    // Exclude the stored reference sequence from the list view to keep the
    // payload small; the detail endpoint (getExperimentById) returns it.
    const experiments = await Experiment.find()
      .select("-referenceSequence")
      .sort({ createdAt: -1 })
      .limit(50);
    return res.json({
      success: true,
      dbConnected: true,
      data: experiments,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getExperimentById = async (req, res) => {
  if (!isDbConnected()) {
    return res.status(503).json({
      success: false,
      message: "Database is offline.",
    });
  }

  try {
    const experiment = await Experiment.findById(req.params.id);
    if (!experiment) {
      return res.status(404).json({ success: false, message: "Experiment not found." });
    }

    const events = await SimulationEvent.find({ experimentId: experiment._id }).sort({ createdAt: 1 });

    return res.json({
      success: true,
      data: {
        experiment,
        events,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
