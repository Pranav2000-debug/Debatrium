/**
 * Downloads a PDF from a URL and returns it as a Buffer.
 * Used by the worker to fetch PDFs from Cloudinary.
 * 
 * Features:
 * - 30 second timeout to prevent hung downloads
 * - Returns Buffer for stateless worker processing
 */

const DOWNLOAD_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Download PDF from URL into memory buffer with timeout.
 * @param {string} url - Cloudinary secure_url
 * @param {number} timeoutMs - Timeout in milliseconds (default: 30s)
 * @returns {Promise<Buffer>} PDF file as buffer
 * @throws {Error} If URL invalid, download fails, or timeout
 */
export async function downloadPdfBuffer(url, timeoutMs = DOWNLOAD_TIMEOUT_MS) {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid PDF URL");
  }

  // AbortController for timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    // Convert AbortError to a clearer message
    if (err.name === "AbortError") {
      throw new Error(`PDF download timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
