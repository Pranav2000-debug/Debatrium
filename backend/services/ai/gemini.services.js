import { GoogleGenAI } from "@google/genai";
import { ApiError } from "../../utils/ApiError.js";
import { loadPrompt } from "./utils/loadPrompt.js";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

function parseGeminiJson(rawResponse) {
  try {
    return JSON.parse(rawResponse);
  } catch {
    const match = rawResponse.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new ApiError(500, "No JSON object found in Gemini response");
    }
    return JSON.parse(match[0]);
  }
}

export async function generateDebateAnalysis({ text }) {
  if (!text || !text.trim()) {
    throw new ApiError(400, "Empty text provided for debate analysis");
  }

  const basePrompt = loadPrompt("counterDebate.prompt.txt");
  const finalPrompt = basePrompt.replace("{{TEXT}}", text);

  try {
    const response = await genAI.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: finalPrompt,
      config: {
        thinkingConfig: { thinkingBudget: -1 },
      },
    });

    const rawResponse = response.text;
    const parsed = parseGeminiJson(rawResponse);

    return {
      counterDebate: parsed.counterDebate ?? "",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      grammarNotes: Array.isArray(parsed.grammarNotes) ? parsed.grammarNotes : [],
      rating: Number(parsed.rating) || 0,
      resources: Array.isArray(parsed.resources) ? parsed.resources : [],
    };
  } catch (error) {
    console.error("Gemini analysis error:", error?.message || error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, "AI generation failed");
  }
}
