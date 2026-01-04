import fs from "fs";
import path from "path";
import { ApiError } from "../../../utils/ApiError.js";

export function loadPrompt(fileName) {
  try {
    const promptPath = path.join(process.cwd(), "services", "ai", "prompts", fileName);
    return fs.readFileSync(promptPath, "utf-8");
  } catch (error) {
    throw new ApiError(500, `Failed to load AI prompt: ${fileName}`);
  }
}
