/**
 * PDF Preprocessing Worker
 * 
 * RESPONSIBILITIES:
 * - Download PDF from Cloudinary
 * - Extract and sanitize text
 * - Generate content hash
 * - Create chunks and save to DB
 * 
 * DESIGN DECISIONS:
 * - Uses separate worker-style Redis connection (maxRetriesPerRequest: null)
 * - Idempotent: checks preprocessStatus before processing
 * - Atomic updates to prevent partial states
 * - Distinguishes transient vs permanent failures
 */

import { Worker } from "bullmq";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import RedisClient from "../redis/redis.js";
import { Pdf } from "../models/pdf.model.js";
import { PdfChunk } from "../models/pdfChunk.model.js";
import { downloadPdfBuffer } from "../utils/downloadPdfBuffer.js";
import { extractPdfText } from "../utils/extractPdfText.js";
import { sanitizeExtractedText } from "../utils/sanitizeExtractedText.js";
import { chunkText } from "../utils/chunkText.js";

const redisInstance = RedisClient.getInstance();
const workerConnection = redisInstance.getClient();

/**
 * Helper for permanent (non-retryable) failures.
 * DESIGN RULE: Throw = transient (retry), Return = terminal (no retry)
 */
function permanentFailure(reason) {
  return { status: "failed", reason };
}

/**
 * Main processor function for PDF preprocessing.
 */
async function processPdfPreprocess(job) {
  const { pdfId } = job.data;
  console.log(`Processing PDF: ${pdfId}`);

  // 1. Fetch PDF document
  const pdf = await Pdf.findById(pdfId).select("+extractedText");

  if (!pdf) {
    console.log(`PDF not found: ${pdfId} - skipping`);
    return { status: "skipped", reason: "not_found" };
  }

  if (pdf.preprocessStatus === "completed") {
    console.log(`PDF already processed: ${pdfId} - skipping`);
    return { status: "skipped", reason: "already_completed" };
  }

  // 2. Transition: pending - processing
  if (pdf.preprocessStatus === "pending") {
    await Pdf.updateOne(
      { _id: pdfId, preprocessStatus: "pending" },
      { $set: { preprocessStatus: "processing" } }
    );
  }

  try {
    job.updateProgress(10);

    // 3. Check PDF size limit (multer limit 10MB + 10MB buffer = 20MB max)
    const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB
    if (pdf.size > MAX_PDF_SIZE) {
      console.error(`PDF too large: ${pdf.size} bytes (max ${MAX_PDF_SIZE})`);
      await markAsFailed(pdfId);
      return permanentFailure("pdf_too_large");
    }

    job.updateProgress(15);

    // 4. Download PDF from Cloudinary
    let pdfBuffer;
    try {
      pdfBuffer = await downloadPdfBuffer(pdf.pdfUrl);
    } catch (err) {
      console.error(`Failed to download PDF: ${err.message}`);
      throw err;
    }

    job.updateProgress(30);

    // 5. Extract text from PDF
    let rawText;
    try {
      rawText = await extractPdfText(pdfBuffer);
    } catch (err) {
      console.error(`Failed to extract text: ${err.message}`);
      await markAsFailed(pdfId);
      return permanentFailure(`extract_failed: ${err.message}`);
    }

    job.updateProgress(50);

    // 6. Sanitize extracted text
    const extractedText = sanitizeExtractedText(rawText);

    if (!extractedText.trim()) {
      console.error(`No readable text in PDF: ${pdfId}`);
      await markAsFailed(pdfId);
      return permanentFailure("no_text");
    }

    job.updateProgress(60);

    // 7. Generate content hash
    const contentHash = crypto
      .createHash("sha256")
      .update(extractedText)
      .digest("hex");

    job.updateProgress(70);

    // 8. Save extractedText and contentHash (status stays "processing" for crash-safety)
    try {
      await Pdf.updateOne(
        { _id: pdfId },
        { $set: { extractedText, contentHash } } // not saving preprocessStatus and is set only after chunks are created
      );
    } catch (err) {
      // E11000 = duplicate key error (user already has PDF with same contentHash)
      // CLEANUP: Delete duplicate PDF entirely - it's redundant data
      // Why delete instead of marking failed:
      // - A failed PDF with no contentHash stays in DB forever
      // - User already has the same content in another PDF
      // - Cleaner to remove orphan record + Cloudinary file
      if (err.code === 11000) {
        console.error(`Duplicate PDF detected: ${pdfId} - deleting duplicate`);

        // Delete from Cloudinary
        try {
          await cloudinary.uploader.destroy(pdf.publicId, { resource_type: "image" });
        } catch (cloudErr) {
          console.error(`Failed to delete from Cloudinary: ${cloudErr.message}`);
        }

        // Delete from MongoDB
        await Pdf.deleteOne({ _id: pdfId });

        return permanentFailure("duplicate_pdf_deleted");
      }
      // simple internal error -> retry
      throw err;
    }

    job.updateProgress(75);

    // 9. Create chunks (crash-safe idempotent)
    // WHY NO existingChunks CHECK:
    // - Partial inserts can occur if worker crashes mid-write
    // - On retry, existingChunks > 0 would skip remaining chunks - data loss
    // - Instead, we always attempt insertMany with ordered: false
    // - Duplicates hit the unique index and fail with E11000 (ignored)
    // - New chunks are inserted successfully
    // - Result: truly idempotent, safe across retries
    const chunks = chunkText(extractedText, { chunkSize: 1200, overlap: 250 });

    if (chunks.length > 0) {
      const pdfStillExists = await Pdf.exists({ _id: pdfId });
      if (!pdfStillExists) {
        console.log(`PDF deleted during processing: ${pdfId} - aborting chunk creation`);
        return permanentFailure("pdf_deleted_during_processing");
      }

      await PdfChunk.insertMany(
        chunks.map((chunk) => ({
          pdf: pdfId,
          user: pdf.user._id || pdf.user, // Store only ObjectId
          index: chunk.index,
          text: chunk.text,
          tokenCount: 0, // To be filled later via Gemini countTokens
        })),
        { ordered: false } // Continue inserting even if some fail (duplicates)
      ).catch((err) => {
        // Ignore E11000 duplicate key errors - expected on retries
        // Unique index { pdf: 1, index: 1 } ensures no duplicate chunks
        if (err.code !== 11000) throw err;
      });
    }

    job.updateProgress(90);

    // 10. Mark as completed (AFTER chunks - crash-safety)
    // If worker crashes before this, status stays "processing" and retry redoes everything
    await Pdf.updateOne(
      { _id: pdfId },
      { $set: { preprocessStatus: "completed" } }
    );

    job.updateProgress(100);

    console.log(`PDF preprocessing completed: ${pdfId}`);
    return { status: "completed", chunks: chunks.length };

  } catch (err) {
    console.error(`Transient error for PDF ${pdfId}: ${err.message}`);
    throw err;
  }
}

/**
 * Mark PDF as permanently failed.
 */
async function markAsFailed(pdfId) {
  await Pdf.updateOne(
    { _id: pdfId, preprocessStatus: { $ne: "completed" } },
    { $set: { preprocessStatus: "failed" } }
  );
}

const pdfPreprocessWorker = new Worker(
  "pdf-preprocess",
  processPdfPreprocess,
  { connection: workerConnection, concurrency: 2 }
);

pdfPreprocessWorker.on("completed", (job, result) => {
  console.log(`Job ${job.id} completed:`, result);
});

pdfPreprocessWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});

pdfPreprocessWorker.on("progress", (job, progress) => {
  console.log(`Job ${job.id} progress: ${progress}%`);
});

pdfPreprocessWorker.on("error", (err) => {
  console.error("Worker error:", err.message);
});

console.log("PDF preprocessing worker started");

export { pdfPreprocessWorker };
