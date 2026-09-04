import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./database/mongodb.js";
import pageRoutes from "./routes/pageRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.get("/", (req, res) => {
  res.json({
    message: "Memory Simulator Backend Running"
  });
});

app.use("/api/pages", pageRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});