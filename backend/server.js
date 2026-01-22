import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app.js";
import { connectDB } from "./db/connectDB.js";
import RedisClient from "./redis/redis.js";

dotenv.config();
const port = process.env.PORT || 8080;

const redisClient = RedisClient.getInstance();
let server;
let pdfPreprocessWorker; // Store worker reference for graceful shutdown

connectDB()
  .then(async () => {
    // Import worker AFTER MongoDB connects (starts automatically)
    // This ensures DB is ready before worker processes jobs
    const workerModule = await import("./workers/pdfPreprocess.worker.js");
    pdfPreprocessWorker = workerModule.pdfPreprocessWorker;

    server = app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      console.log(`Redis initialized`);
      console.log(`MongoDB connected`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error", err);
    process.exit(1);
  });

// Graceful shutdown function
async function gracefulShutdown(signal) {
  console.log(`\n ${signal} received. Shutting down gracefully...`);

  try {
    // Close server first (stop accepting new requests)
    await new Promise((res, rej) => {
      server.close((err) => {
        if (err) return rej(err);
        console.log("HTTP server closed");
        res();
      });
    });

    // Close BullMQ worker (waits for current job to finish)
    if (pdfPreprocessWorker) {
      await pdfPreprocessWorker.close();
      console.log("PDF preprocessing worker closed");
    }

    // Close BullMQ queue
    const { pdfPreprocessQueue } = await import("./queues/pdfPreprocess.queue.js");
    await pdfPreprocessQueue.close();
    console.log("PDF preprocessing queue closed");

    // Close Redis connection
    await redisClient.disconnect();
    console.log("Redis connection closed");

    // Close MongoDB connection
    await mongoose.connection.close();
    console.log("MongoDB connection closed");

    console.log("Shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

// Handle different termination signals
process.on("SIGINT", () => gracefulShutdown("SIGINT")); // Ctrl+C
process.on("SIGTERM", () => gracefulShutdown("SIGTERM")); // Kill command
process.on("SIGUSR2", () => gracefulShutdown("SIGUSR2")); // Nodemon restart

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});
