export function sanitizeExtractedText(text) {
  if (!text || typeof text !== "string") return "";

  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove null bytes & control chars (except newline + tab)
    .normalize("NFKC") // Normalize Unicode
    .replace(/[ \t]+/g, " ") // Collapse excessive whitespace
    .replace(/\n{3,}/g, "\n\n")
    .trim(); // Trim edges
}
