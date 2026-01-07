import fs from "fs";
import { v2 as cloudinary } from "cloudinary";
import crypto from "crypto";
import { uploadPdfToCloudinary } from "../cloudinary/cloudinary.js";
import { Pdf } from "../models/pdf.model.js";
import { ApiError, ApiResponse, asyncHandler } from "../utils/utilBarrel.js";
import { extractPdfText } from "../utils/extractPdfText.js";
import { sanitizeExtractedText } from "../utils/sanitizeExtractedText.js";

/**
 * Safely delete local uploaded file (disk storage cleanup)
 */
const safeUnlink = (filePath) => {
  if (!filePath) return;
  fs.unlink(filePath, () => {});
};

// ==============================
// UPLOAD PDF CONTROLLER
// ==============================
export const uploadPdfController = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "No PDF uploaded");
  }

  // Extract text from PDF
  let rawText;
  try {
    rawText = await extractPdfText(req.file.path);
  } catch {
    safeUnlink(req.file.path);
    throw new ApiError(400, "Failed to extract text from PDF");
  }

  // Sanitize extracted text
  const extractedText = sanitizeExtractedText(rawText);
  if (!extractedText.trim()) {
    safeUnlink(req.file.path);
    throw new ApiError(400, "No readable text found in PDF (possibly scanned)");
  }

  // generate hash for duplicate finding and race conditon uploads of duplicates
  const contentHash = crypto.createHash("sha256").update(extractedText).digest("hex");

  // Upload PDF to Cloudinary
  const cloudinaryResult = await uploadPdfToCloudinary(req.file.path, req.file.originalname);

  if (!cloudinaryResult) {
    safeUnlink(req.file.path);
    throw new ApiError(500, "Failed to upload PDF, retry");
  }

  // Prepare DB payload
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
    extractedText,
    status: "uploaded",
    contentHash: contentHash,
  };

  // Save to DB
  let pdfDoc;
  try {
    pdfDoc = await Pdf.create(uploadDetails);
  } catch (err) {
    // DB duplicate enforce code check
    if (err.code === 11000) {
      await cloudinary.uploader.destroy(cloudinaryResult.public_id, {
        resource_type: "image",
      });
      safeUnlink(req.file.path);
      throw new ApiError(500, "This PDF was already uploaded.");
    }

    await cloudinary.uploader.destroy(cloudinaryResult.public_id, {
      resource_type: "image",
    });
    safeUnlink(req.file.path);
    throw new ApiError(500, "Upload failed, please retry");
  }

  // Cleanup local file (SUCCESS PATH)
  safeUnlink(req.file.path);

  return res.status(201).json(new ApiResponse(201, { pdf: pdfDoc }, "Upload successful"));
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

  // Delete from Cloudinary
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
  });

  //  Delete from DB
  await Pdf.deleteOne({ _id: pdf._id });

  return res.status(200).json(new ApiResponse(200, null, "PDF deleted"));
});
