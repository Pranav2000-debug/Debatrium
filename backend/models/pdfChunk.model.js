import mongoose from "mongoose";

const pdfChunkSchema = new mongoose.Schema(
  {
    // Parent PDF
    pdf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pdf",
      required: true,
      index: true,
    },

    // Owner
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Chunk order within the PDF
    index: {
      type: Number,
      required: true,
    },

    // chunk content
    text: {
      type: String,
      required: true,
    },

    // required later (Gemini token counting)
    tokenCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);
// for a given pdf, no two chunks can have the same index
pdfChunkSchema.index({ pdf: 1, index: 1 }, { unique: true });

export const PdfChunk = mongoose.model("PdfChunk", pdfChunkSchema);
