import { GoogleGenAI } from "@google/genai";
import { ApiError } from "../../utils/ApiError.js";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateDebateAnalysis({ text }) {
  const basePrompt = loadPrompt("counterDebate.prompt.txt");
  const finalPrompt = basePrompt.replace("{{TEXT}}", text);
  try {
    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: finalPrompt,
      config: {
        thinkingConfig: {
          thinkingBudget: 0, // disabling chain of thought
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
      throw new ApiError(500, "Gemini returned non-JSON output for counter debate");
    }

    return {
      counterDebate: parsedResponse.counterDebate ?? "",
      strengths: parsedResponse.strengths ?? [],
      weaknesses: parsedResponse.weaknesses ?? [],
      grammarNotes: parsedResponse.grammarNotes ?? [],
      rating: Number(parsedResponse.rating) || 0,
      resources: parsedResponse.resources ?? [],
    };
  } catch (error) {
    console.log("Gemini service error!!", error);
    throw new ApiError(500, "AI generation failed");
  }
}
