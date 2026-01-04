import fs from "fs";
import { PDFParse } from "pdf-parse";

export async function extractPdfText(filePath) {
  if (!filePath || typeof filePath !== "string") {
    throw new Error("Invalid PDF path, could not extract");
  }

  // Read file from disk into buffer
  const buffer = fs.readFileSync(filePath);

  if (!Buffer.isBuffer(buffer)) {
    throw new Error("Failed to read PDF file as buffer");
  }

  const data = new PDFParse({ data: buffer });
  const result = await data.getText();

  return result.text || "";
}
