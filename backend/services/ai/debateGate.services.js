import { ApiError } from "../../utils/ApiError.js";
import { GoogleGenAI } from "@google/genai";
import { loadPrompt } from "./utils/loadPrompt.js";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
export async function analyzeDebateSutaibility({ text }) {
  const basePrompt = loadPrompt("debateAnalysis.prompt.txt");
  const finalPrompt = basePrompt.replace("{{TEXT}}", text);
  // todo
  try {
    if (!text || !text.trim()) throw new ApiError(400, "Empty text provided for debate analysis");

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: finalPrompt,
      config: {
        thinkingConfig: {
          thinkingBudget: -1, // disabling chain of thought
        },
      },
    });
    const rawResponse = response.text;
    const cleanedRawResponse = rawResponse
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    let parsedResponse;
    try {
      const jsonStart = cleanedRawResponse.indexOf("{");
      const jsonEnd = cleanedRawResponse.lastIndexOf("}");

      if (jsonStart === -1 || jsonEnd === -1) {
        throw new ApiError(500, "Gemini returned invalid output for debate gate");
      }

      parsedResponse = JSON.parse(cleanedRawResponse.slice(jsonStart, jsonEnd + 1));
    } catch (error) {
      throw new ApiError(500, "Gemini returned non-JSON output for debate gate");
    }

    // schema validation
    if (
      typeof parsedResponse.isDebate !== "boolean" ||
      typeof parsedResponse.confidence !== "number" ||
      typeof parsedResponse.reason !== "string" ||
      !("detectedTopic" in parsedResponse)
    ) {
      throw new Error("Debate gate response schema mismatch");
    }
    return {
      isDebate: parsedResponse.isDebate,
      confidence: parsedResponse.confidence,
      reason: parsedResponse.reason,
      detectedTopic: parsedResponse.detectedTopic ?? null,
    };
  } catch (error) {
    console.log("Gemini debate gate error!!", error);
    throw new ApiError(500, "Debate suitability analysis failed");
  }
}
