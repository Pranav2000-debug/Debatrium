/**
 * Chunk text into overlapping segments.
 * Character-based for now, deterministic and dependency-free.
 *
 * @param {string} text
 * @param {object} options
 * @param {number} options.chunkSize - max characters per chunk
 * @param {number} options.overlap - overlapping characters between chunks
 */
export function chunkText(text, { chunkSize = 4000, overlap = 500 } = {}) {
  if (!text || typeof text !== "string") return [];

  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunk = text.slice(start, end).trim();

    if (chunk) {
      chunks.push({
        index,
        text: chunk,
      });
      index++;
    }

    // move forward with overlap
    start = end - overlap;
    if (start < 0) start = 0;
  }

  return chunks;
}
