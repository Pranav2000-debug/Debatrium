import dotenv from "dotenv";
import mongoose from "mongoose";
import app from "./app.js";
import { connectDB } from "./db/connectDB.js";
import RedisClient from "./redis/redis.js";

dotenv.config();
const port = process.env.PORT || 8080;

const redisClient = RedisClient.getInstance();
let server;
let pdfPreprocessWorker;

connectDB()
  .then(async () => {
    // Recover stuck PDFs before worker starts
    const { recoverOrphanedPdfs } = await import("./utils/recoverOrphanedPdfs.js");
    await recoverOrphanedPdfs();

    // Start worker after DB is ready
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

async function gracefulShutdown(signal) {
  console.log(`\n ${signal} received. Shutting down gracefully...`);

  try {
    await new Promise((res, rej) => {
      server.close((err) => {
        if (err) return rej(err);
        console.log("HTTP server closed");
        res();
      });
    });

    if (pdfPreprocessWorker) {
      await pdfPreprocessWorker.close();
      console.log("PDF preprocessing worker closed");
    }

    const { pdfPreprocessQueue } = await import("./queues/pdfPreprocess.queue.js");
    await pdfPreprocessQueue.close();
    console.log("PDF preprocessing queue closed");

    await redisClient.disconnect();
    console.log("Redis connection closed");

    await mongoose.connection.close();
    console.log("MongoDB connection closed");

    console.log("Shutdown complete");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGUSR2", () => gracefulShutdown("SIGUSR2"));

process.on("uncaughtException", (error) => {
  console.error("x Uncaught Exception:", error);
  gracefulShutdown("uncaughtException");
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("x Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown("unhandledRejection");
});
