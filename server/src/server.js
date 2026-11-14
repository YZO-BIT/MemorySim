import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB, { isDbConnected } from "./database/mongodb.js";
import pageRoutes from "./routes/pageRoutes.js";
import simulationRoutes from "./routes/simulation.routes.js";
import experimentRoutes from "./routes/experiment.routes.js";
import workloadRoutes from "./routes/workload.routes.js";
import { getEngineBinaryPath } from "./services/simulator.service.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.get("/", (req, res) => {
  const enginePath = getEngineBinaryPath();
  res.json({
    status: "ok",
    message: "System Storage Simulator Backend Running",
    databaseConnected: isDbConnected(),
    engineAvailable: !!enginePath,
    enginePath: enginePath || "NOT FOUND",
  });
});

app.get("/api/status", (req, res) => {
  const enginePath = getEngineBinaryPath();
  res.json({
    status: "ok",
    databaseConnected: isDbConnected(),
    engineAvailable: !!enginePath,
  });
});

app.use("/api/pages", pageRoutes);
app.use("/api/simulation", simulationRoutes);
app.use("/api/experiments", experimentRoutes);
app.use("/api/workload", workloadRoutes);

app.use((err, req, res, next) => {
  console.error("[Server Error]:", err);
  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;

const isMain = process.argv[1] && process.argv[1].endsWith("server.js");
if (process.env.NODE_ENV !== "test" && isMain) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;