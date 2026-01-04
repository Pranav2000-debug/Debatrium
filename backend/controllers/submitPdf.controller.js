import { Pdf } from "../models/pdf.model.js";
import { analyzeDebateSutaibility } from "../services/ai/debateGate.services.js";
import { generateDebateAnalysis } from "../services/ai/gemini.services.js";
import { ApiResponse, ApiError, asyncHandler } from "../utils/utilBarrel.js";

export const submitPdfToAI = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const pdf = await Pdf.findOne({
    _id: id,
    user: req.user._id,
  }).select("+extractedText");

  if (!pdf) {
    throw new ApiError(404, "PDF not found, cannot submit to AI");
  }

  // backend safety guard
  if (pdf.status === "processing") {
    throw new ApiError(409, "PDF is already being processed");
  }
  pdf.status = "processing";
  await pdf.save();

  try {
    // Debate gate
    const gateResult = await analyzeDebateSutaibility({
      text: pdf.extractedText,
    });

    // persist gate result early
    pdf.aiResult = { gate: gateResult };

    // Not debate-suitable → graceful exit
    if (!gateResult.isDebate) {
      pdf.status = "completed";
      await pdf.save();

      return res.status(200).json(new ApiResponse(200, { pdf }, "PDF is not suitable for debate"));
    }

    // Debate-suitable → full analysis
    if (!pdf.extractedText?.trim()) {
      throw new ApiError(400, "No readable text found in PDF (possibly scanned)");
    }

    const analysisResult = await generateDebateAnalysis({
      text: pdf.extractedText,
    });

    pdf.aiResult = {
      gate: gateResult,
      analysis: analysisResult,
    };
    pdf.status = "completed";
    await pdf.save();

    return res.status(200).json(new ApiResponse(200, { pdf }, "AI processing completed"));
  } catch (error) {
    pdf.status = "failed";
    await pdf.save();
    
    if (error?.status === 429 || error?.message?.toLowerCase().includes("quota") || error?.message?.toLowerCase().includes("rate")) {
      throw new ApiError(429, "AI usage limit reached. Please try again later.");
    }

    // preserve ApiError if already thrown
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(500, "AI processing failed. Please try again later.");
  }
});
