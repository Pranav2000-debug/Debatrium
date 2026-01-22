import { PDFParse } from "pdf-parse";

/**
 * Extract text from a PDF buffer.
 * 
 * STRICT CONTRACT:
 * - Only accepts Buffer input (from downloadPdfBuffer)
 * - No file path support (controllers no longer extract text)
 * - All extraction happens in workers, which download PDFs as Buffers
 * 
 * @param {Buffer} pdfBuffer - PDF file as Buffer
 * @returns {Promise<string>} Extracted text
 * @throws {Error} If input is not a Buffer
 */
export async function extractPdfText(pdfBuffer) {
  // Enforce strict Buffer-only contract
  if (!Buffer.isBuffer(pdfBuffer)) {
    throw new Error("extractPdfText: expected Buffer input, received " + typeof pdfBuffer);
  }

  const data = new PDFParse({ data: pdfBuffer });
  const result = await data.getText();

  return result.text || "";
}
