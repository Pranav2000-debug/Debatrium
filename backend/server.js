import cluster from "cluster";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Cluster-based Server Architecture
 * 
 * PRIMARY PROCESS:
 * - Connects to MongoDB
 * - Starts HTTP server
 * - Forks worker process for BullMQ
 * - Handles graceful shutdown via IPC
 * 
 * WORKER PROCESS:
 * - Own MongoDB/Redis connections
 * - Runs BullMQ PDF preprocessing worker
 * - Receives shutdown signal from primary via IPC
 */

// PRIMARY PROCESS - HTTP Server + Worker Manager

if (cluster.isPrimary) {

  const mongoose = await import("mongoose");
  const { default: app } = await import("./app.js");
  const { connectDB } = await import("./db/connectDB.js");
  const { default: RedisClient } = await import("./redis/redis.js");

  const port = process.env.PORT || 8080;
  const redisClient = RedisClient.getInstance();
  let server;
  let worker = null;
  let isShuttingDown = false;

  console.log(`Primary process started, PID: ${process.pid}`);

  // Fork worker process function
  function forkWorker() {
    worker = cluster.fork();
    console.log(`Forked worker process, PID: ${worker.process.pid}`);

    // Handle messages from worker
    worker.on("message", (msg) => {
      if (msg?.type === "ready") {
        console.log("Worker reported ready");
      } else if (msg?.type === "shutdown-complete") {
        console.log("Worker shutdown complete");
      } else if (msg?.type === "startup-error") {
        console.error("Worker startup failed:", msg.error);
      }
    });

    // Handle worker exit
    worker.on("exit", (code, signal) => {
      console.log(`Worker exited with code ${code}, signal ${signal}`);

      // Auto-respawn unless we're shutting down
      if (!isShuttingDown) {
        console.log("Respawning worker...");
        setTimeout(() => forkWorker(), 1000); // 1s delay before respawn
      }
    });
  }

  // Graceful shutdown function for primary
  async function gracefulShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n${signal} received. Shutting down gracefully...`);

    try {
      // 1. Stop accepting new HTTP requests
      if (server) {
        await new Promise((res, rej) => {
          server.close((err) => {
            if (err) return rej(err);
            console.log("HTTP server closed");
            res();
          });
        });
      }

      // 2. Signal worker to shutdown and wait
      if (worker && !worker.isDead()) {
        console.log("Signaling worker to shutdown...");
        worker.send({ type: "shutdown" });

        // Wait for worker to exit (max 30 seconds)
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.log("Worker shutdown timeout, forcing...");
            worker.kill("SIGKILL");
            resolve();
          }, 30000);

          worker.on("exit", () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }

      // 3. Close BullMQ queue (producer side)
      try {
        const { pdfPreprocessQueue } = await import("./queues/pdfPreprocess.queue.js");
        await pdfPreprocessQueue.close();
        console.log("PDF preprocessing queue closed");
      } catch (err) {
        console.error("Error closing queue:", err.message);
      }

      // 4. Close Redis connection
      await redisClient.disconnect();
      console.log("Redis connection closed");

      // 5. Close MongoDB connection
      await mongoose.default.connection.close();
      console.log("MongoDB connection closed");

      console.log("Primary shutdown complete");
      process.exit(0);

    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  }

  // Handle termination signals
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGUSR2", () => gracefulShutdown("SIGUSR2"));

  // Handle uncaught errors
  process.on("uncaughtException", (error) => {
    console.error("Uncaught Exception:", error);
    gracefulShutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    gracefulShutdown("unhandledRejection");
  });

  // Start the server
  try {
    await connectDB();

    server = app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
      console.log(`Redis initialized`);
      console.log(`MongoDB connected`);
    });

    // Fork worker after server is listening
    forkWorker();

  } catch (err) {
    console.error("Startup error:", err);
    process.exit(1);
  }

} else {

  // WORKER PROCESS - Delegated to workerEntry.js
  // Dynamic import to keep worker code separate

  await import("./workerEntry.js");
}
