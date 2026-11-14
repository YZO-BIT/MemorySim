import express from "express";
import Page from "../models/Page.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const pages = await Page.find();
    res.json(pages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const page = await Page.create(req.body);
    res.status(201).json(page);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;