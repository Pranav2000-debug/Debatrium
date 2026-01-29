import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import { uploadPdfToCloudinary } from "../cloudinary/cloudinary.js";
import { Pdf } from "../models/pdf.model.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/utilBarrel.js";
import { enqueuePdfPreprocess, pdfPreprocessQueue } from "../queues/pdfPreprocess.queue.js";
import { PdfChunk } from "../models/pdfChunk.model.js";

/**
 * Safely delete local uploaded file (disk storage cleanup)
 */
const safeUnlink = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, () => { });
};

// ==============================
// UPLOAD PDF CONTROLLER
// ==============================
// RESPONSIBILITIES:
// - Upload PDF to Cloudinary
// - Create PDF document with preprocessStatus: "pending"
// - Enqueue preprocessing job
//
// DOES NOT:
// - Extract text
// - Sanitize text
// - Generate hash
// - Create chunks
// (All heavy work happens in the worker)
// ==============================
export const uploadPdfController = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No PDF uploaded");
  }

  // Upload PDF to Cloudinary
  const cloudinaryResult = await uploadPdfToCloudinary(req.file.path, req.file.originalname);

  if (!cloudinaryResult) {
    safeUnlink(req.file.path);
    throw new ApiError(500, "Failed to upload PDF, retry");
  }

  // Prepare DB payload (minimal - preprocessing happens in worker)
  const uploadDetails = {
    user: req.user._id,
    publicId: cloudinaryResult.public_id,
    pdfUrl: cloudinaryResult.secure_url,
    previewImageUrl: cloudinary.url(cloudinaryResult?.public_id, {
      resource_type: "image",
      format: "jpg",
      transformation: [{ page: 1 }, { width: 400, crop: "fit" }],
    }),
    originalName: cloudinaryResult.original_filename,
    size: cloudinaryResult.bytes,
    // Preprocessing fields - set to pending, worker will populate
    preprocessStatus: "pending",
    extractedText: null,
    contentHash: null,
    // AI lifecycle - idle by default
    status: "idle",
  };

  // Save to DB
  let pdfDoc;
  try {
    pdfDoc = await Pdf.create(uploadDetails);
  } catch (err) {
    // Cleanup on failure
    await cloudinary.uploader.destroy(cloudinaryResult.public_id, {
      resource_type: "image",
    });
    safeUnlink(req.file.path);

    if (err.code === 11000) {
      throw new ApiError(409, "This PDF was already uploaded.");
    }

    throw new ApiError(500, "Upload failed, please retry");
  }

  safeUnlink(req.file.path);

  // Send response immediately - don't wait for Redis I/O
  // Order: Cloudinary upload - DB write - HTTP response - background enqueue
  // Return only safe fields (matches getMyPdfs response format)
  res.status(201).json(
    new ApiResponse(201, {
      pdf: {
        publicId: pdfDoc.publicId,
        previewImageUrl: pdfDoc.previewImageUrl,
        originalName: pdfDoc.originalName,
        size: pdfDoc.size,
        createdAt: pdfDoc.createdAt,
        preprocessStatus: pdfDoc.preprocessStatus,
        status: pdfDoc.status,
      }
    }, "Upload successful, preprocessing started")
  );

  // Fire-and-forget: enqueue in background
  // - DB is source of truth (preprocessStatus: "pending")
  // - If enqueue fails, PDF stays "pending" (can re-enqueue later)
  // - Worker is idempotent (handles duplicates)
  // - User response should never wait on background orchestration
  setImmediate(async () => {
    try {
      await enqueuePdfPreprocess(pdfDoc._id);
    } catch (err) {
      console.error(`Failed to enqueue preprocessing for ${pdfDoc._id}: ${err.message}`);
      // PDF stays in "pending" state - can be recovered via admin or cron
    }
  });
});

// DELETE PDF CONTROLLER
export const deletePdf = asyncHandler(async (req, res) => {
  const publicId = decodeURIComponent(req.params.publicId);

  const pdf = await Pdf.findOne({
    publicId,
    user: req.user._id,
  });

  if (!pdf) {
    throw new ApiError(404, "PDF not found, cannot delete");
  }

  // ========================================
  // Set deletion marker BEFORE job removal
  // This signals the worker to abort chunk inserts if still processing
  // ========================================
  await Pdf.updateOne(
    { _id: pdf._id },
    { $set: { preprocessStatus: "deleting" } }
  );

  // ========================================
  // Best-effort job removal from queue
  // ========================================
  try {
    const jobId = pdf._id.toString();
    const job = await pdfPreprocessQueue.getJob(jobId);

    // Only attempt removal if job exists and is pending
    if (job && ["waiting", "delayed"].includes(await job.getState())) {
      await job.remove();
      console.log(`Removed pending job: ${jobId}`);
    }
  } catch {
    // Ignore - worker handles missing PDFs safely
    console.log(`Job not pending - skipping removal`);
  }

  // Delete from Cloudinary
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });

  // Delete chunks (may not exist if preprocessing hasn't completed yet)
  await PdfChunk.deleteMany({ pdf: pdf._id });

  // Delete PDF document
  await Pdf.deleteOne({ _id: pdf._id });

  return res.status(200).json(new ApiResponse(200, null, "PDF deleted"));
});
