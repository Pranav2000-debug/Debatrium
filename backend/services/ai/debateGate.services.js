import { ApiError } from "../../utils/ApiError.js";
import { GoogleGenAI } from "@google/genai";
import { loadPrompt } from "./utils/loadPrompt.js";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
/**
 * Safely parse Gemini JSON output
 */
function parseGeminiJson(rawResponse) {
  try {
    // Best case: pure JSON
    return JSON.parse(rawResponse);
  } catch {
    // Fallback: extract first JSON object
    const match = rawResponse.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new ApiError(500, "No JSON object found in Gemini response");
    }
    return JSON.parse(match[0]);
  }
}

export async function analyzeDebateSutaibility({ text }) {
  if (!text || !text.trim()) {
    throw new ApiError(400, "Empty text provided for debate analysis");
  }

  const basePrompt = loadPrompt("debateAnalysis.prompt.txt");
  const finalPrompt = basePrompt.replace("{{TEXT}}", text);

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: finalPrompt,
      config: {
        thinkingConfig: { thinkingBudget: -1 },
      },
    });

    const rawResponse = response.text;
    const parsed = parseGeminiJson(rawResponse);

    // Normalize and validate schema (LLM-safe)
    const confidence = Number(parsed.confidence);

    if (
      typeof parsed.isDebate !== "boolean" ||
      Number.isNaN(confidence) ||
      !("detectedTopic" in parsed) ||
      (parsed.isDebate && typeof parsed.detectedTopic !== "string") ||
      (!parsed.isDebate && parsed.detectedTopic !== null) ||
      (parsed.reason !== null && typeof parsed.reason !== "string")
    ) {
      throw new ApiError(500, "Debate gate response schema mismatch");
    }

    return {
      isDebate: parsed.isDebate,
      confidence,
      reason: parsed.reason,
      detectedTopic: parsed.detectedTopic ?? null,
    };
  } catch (error) {
    console.error("Gemini debate gate error:", error?.message || error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "Debate suitability analysis failed");
  }
}
