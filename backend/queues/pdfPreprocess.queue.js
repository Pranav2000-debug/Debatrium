/**
 * PDF Preprocessing Queue
 * 
 * WHY SEPARATE CONNECTION:
 * - BullMQ requires Queue and Worker to use different Redis connections
 * - Producer connections use maxRetriesPerRequest: 1 (fail fast for user-facing ops)
 * 
 * JOB DEDUPLICATION:
 * - jobId = pdfId.toString() prevents duplicate jobs for the same PDF
 */

import { Queue } from "bullmq";
import RedisClient from "../redis/redis.js";

const redisInstance = RedisClient.getInstance();
const producerConnection = redisInstance.createNewConnection();

// Create the queue with producer connection
export const pdfPreprocessQueue = new Queue("pdf-preprocess", {
  connection: producerConnection,
  defaultJobOptions: {
    attempts: 3, // Retry up to 3 times
    backoff: {
      type: "exponential",
      delay: 3000, // Start with 3s, then 6s, then 12s
    },
    timeout: 1000 * 60 * 1, // 60 seconds
    removeOnComplete: 100, // Keep last 100 completed jobs for debugging
    removeOnFail: 200, // Keep last 200 failed jobs for debugging
  },
});

/**
 * Enqueue a PDF for preprocessing.
 * Uses pdfId as jobId to prevent duplicate jobs.
 * @param {string} pdfId - MongoDB ObjectId of the PDF document
 */
export async function enqueuePdfPreprocess(pdfId) {
  const jobId = pdfId.toString(); // Prevent duplicate jobs for same PDF

  try {
    await pdfPreprocessQueue.add(
      "preprocess", // Job name
      { pdfId: jobId }, // Job data
      { jobId } // Use pdfId as unique job identifier
    );
    console.log(`Enqueued PDF preprocessing job: ${jobId}`);
  } catch (err) {
    // Silently ignore "Job already exists" - expected for deduplication
    if (err.message?.includes("Job already exists")) {
      console.log(`Job already exists for PDF: ${jobId} - skipping enqueue`);
      return;
    }
    // Rethrow any other errors
    throw err;
  }
}
