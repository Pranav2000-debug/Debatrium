import mongoose from "mongoose";

const pdfSchema = new mongoose.Schema(
  {
    // ======================
    // Ownership
    // ======================
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ======================
    // Storage (Cloudinary)
    // ======================
    publicId: {
      type: String,
      required: true,
      unique: true,
    },

    pdfUrl: {
      type: String,
      required: true,
    },

    previewImageUrl: {
      type: String,
      required: true,
    },

    // ======================
    // Metadata
    // ======================
    originalName: {
      type: String,
      required: true,
    },

    size: {
      type: Number, // bytes
      required: true,
    },

    // ======================
    // Preprocessing (system-owned)
    // ======================
    preprocessStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "deleting"],
      default: "pending",
      index: true,
    },

    contentHash: {
      type: String,
      default: null, // computed during preprocessing
      index: true,
    },

    extractedText: {
      type: String,
      default: null,
      select: false, // never send full text accidentally
    },

    // ======================
    // AI lifecycle (user-triggered)
    // ======================
    status: {
      type: String,
      enum: ["idle", "processing", "completed", "failed"],
      default: "idle",
      index: true,
    },

    isConsumed: {
      type: Boolean,
      default: false,
      index: true,
    },

    aiResult: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// ======================
// Uniqueness constraints
// ======================

// Prevent duplicate PDFs per user (semantic duplicate)
// sparse: true - avoids uniqueness issues before hash exists. only enfore uniqueness when the value exists.
pdfSchema.index({ user: 1, contentHash: 1 }, { unique: true, sparse: true });

export const Pdf = mongoose.model("Pdf", pdfSchema);

/**
 * uploading - frontend-only UI state (spinner, disable clicks)
 * preprocessStatus - backend readiness (chunks/text prepared)
 * status: "idle" - AI has not been started yet
 * 
 */
