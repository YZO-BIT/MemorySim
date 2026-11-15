import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let dbConnected = false;

export const isDbConnected = () => dbConnected;

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.warn("[Database] MONGO_URI not configured. Running in standalone/offline mode.");
    dbConnected = false;
    return false;
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    });
    dbConnected = true;
    console.log("[Database] MongoDB Connected successfully");
    return true;
  } catch (error) {
    dbConnected = false;
    console.warn(`[Database] MongoDB connection failed (${error.message}). Running in standalone/offline mode.`);
    return false;
  }
};

export default connectDB;