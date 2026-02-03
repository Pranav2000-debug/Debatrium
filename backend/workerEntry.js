/**
 * Worker Entry Point for Cluster Fork
 * 
 * This file runs in a forked child process and initializes:
 * 1. Its own MongoDB connection
 * 2. Its own Redis singleton instance
 * 3. BullMQ PDF preprocessing worker
 * 
 * Communicates with primary process via IPC for graceful shutdown.
 */

import cluster from "cluster";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./db/connectDB.js";
import RedisClient from "./redis/redis.js";

// Ensure this only runs as a worker
if (!cluster.isWorker) {
  console.error("workerEntry.js must be run as a cluster worker");
  process.exit(1);
}

dotenv.config();

console.log(`Worker process started, PID: ${process.pid}`);

let pdfPreprocessWorker = null;
let isShuttingDown = false;

async function startWorker() {
  try {
    // 1. Connect to MongoDB (own connection for this process)
    await connectDB();
    console.log("Worker MongoDB connected");

    // 2. Initialize Redis singleton (creates own connection in this process)
    const redisClient = RedisClient.getInstance();

    // 3. Import and start BullMQ worker
    const workerModule = await import("./workers/pdfPreprocess.worker.js");
    pdfPreprocessWorker = workerModule.pdfPreprocessWorker;

    // Notify primary that worker is ready
    process.send?.({ type: "ready" });

  } catch (error) {
    console.error("Worker startup failed:", error);
    process.send?.({ type: "startup-error", error: error.message });
    process.exit(1);
  }
}

async function gracefulShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log("Worker shutting down gracefully...");

  try {
    // 1. Close BullMQ worker (waits for current job to finish)
    if (pdfPreprocessWorker) {
      await pdfPreprocessWorker.close();
      console.log("Worker: PDF preprocessing worker closed");
    }

    // 2. Close Redis connection
    const redisClient = RedisClient.getInstance();
    await redisClient.disconnect();
    console.log("Worker: Redis connection closed");

    // 3. Close MongoDB connection
    await mongoose.connection.close();
    console.log("Worker: MongoDB connection closed");

    // Notify primary that shutdown is complete
    process.send?.({ type: "shutdown-complete" });

    console.log("Worker shutdown complete");
    process.exit(0);

  } catch (error) {
    console.error("Worker shutdown error:", error);
    process.exit(1);
  }
}

// Listen for shutdown signal from primary
process.on("message", (msg) => {
  if (msg?.type === "shutdown") {
    gracefulShutdown();
  }
});

// Handle direct signals (backup)
process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);

// Start the worker
startWorker();
