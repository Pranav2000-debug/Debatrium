/**
 * Chunk text into overlapping segments.
 * Character-based for now, deterministic and dependency-free.
 *
 * @param {string} text
 * @param {object} options
 * @param {number} options.chunkSize -> max characters per chunk
 * @param {number} options.overlap -> overlapping characters between chunks
 */

export function chunkText(text, { chunkSize = 4000, overlap = 500 } = {}) {
  if (!text || typeof text !== "string") return [];

  if (overlap >= chunkSize) {
    throw new Error("Overlap must be smaller than chunkSize");
  }

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

    // Move forward: next chunk starts at (current_end - overlap)
    start = end - overlap;

    // if we're at the end, break to avoid infinite loop
    if (end === text.length) break;
  }

  return chunks;
}

/**
 * Algo progression and prevent infinite loops
 *
 * new_start > old_start
 * old_end - overlap > old_start
 * (old_start + chunkSize) - overlap > old_start
 * chunkSize - overlap > 0
 * hence -
 * chunkSize > overlap
 */
