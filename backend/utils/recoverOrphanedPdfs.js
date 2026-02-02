/**
 * Scans for PDFs stuck in pending/processing and re-enqueues them.
 * Called on server startup and Redis reconnection.
 */
import { Pdf } from "../models/pdf.model.js";
import { enqueuePdfPreprocess } from "../queues/pdfPreprocess.queue.js";

export async function recoverOrphanedPdfs() {
  const orphaned = await Pdf.find({
    preprocessStatus: { $in: ["pending", "processing"] }
  }).select("_id").lean();

  if (orphaned.length === 0) {
    console.log("No orphaned PDFs found");
    return;
  }

  console.log(`Found ${orphaned.length} orphaned PDFs - re-enqueuing...`);

  for (const pdf of orphaned) {
    console.log(`  → Re-enqueuing PDF: ${pdf._id}`);
    await enqueuePdfPreprocess(pdf._id);
  }

  console.log(`✅ Recovered ${orphaned.length} orphaned PDFs`);
}
