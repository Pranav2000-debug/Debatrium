/**
 * PdfCard Button Logic:
 * 
 * | preprocessStatus | status     | Buttons Shown        |
 * |------------------|------------|----------------------|
 * | pending/processing | -        | (overlay Only)       |
 * | failed           | -          | Delete only          |
 * | completed        | idle       | Submit + Delete      |
 * | completed        | processing | (overlay)            |
 * | completed        | completed  | Details + Delete     |
 * | completed        | failed     | Retry + Delete       |
 */

export default function PdfCard({ pdf, onSubmit, onDelete, onDetails }) {
  const createdDate = new Date(pdf.createdAt);

  // State checks
  const isWorkerProcessing = pdf.preprocessStatus === "pending" || pdf.preprocessStatus === "processing";
  const isWorkerFailed = pdf.preprocessStatus === "failed";
  const isWorkerComplete = pdf.preprocessStatus === "completed";

  const isAIProcessing = isWorkerComplete && pdf.status === "processing";
  const isAIIdle = isWorkerComplete && pdf.status === "idle";
  const isAIComplete = isWorkerComplete && pdf.status === "completed";
  const isAIFailed = isWorkerComplete && pdf.status === "failed";

  // Determine overlay state
  const showOverlay = isWorkerProcessing || isAIProcessing;
  const overlayMessage = isWorkerProcessing ? "Preprocessing…" : "AI Processing…";

  return (
    <div className="relative group rounded-xl overflow-hidden border border-neutral-700 bg-neutral-900 transition hover:border-yellow-400 hover:shadow-[0_0_18px_rgba(234,179,8,0.18)]">
      {/* PROCESSING OVERLAY */}
      {showOverlay && (
        <div className="absolute inset-0 z-20 bg-black/70 flex items-center justify-center">
          <span className="text-sm text-yellow-400 animate-pulse">{overlayMessage}</span>
        </div>
      )}

      {/* PREVIEW */}
      <div className="relative h-48 bg-neutral-800 touch-manipulation">
        <img src={pdf.previewImageUrl} alt={pdf.originalName} className="h-full w-full object-cover" />

        {/* HOVER ACTIONS */}
        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-black/60 transition opacity-100 pointer-events-auto lg:opacity-0 lg:pointer-events-none lg:group-hover:opacity-100 lg:group-hover:pointer-events-auto">
          {/* SUBMIT - only when worker complete and AI idle */}
          {isAIIdle && (
            <button
              onClick={onSubmit}
              className="rounded-md bg-slate-800/80 text-slate-200 border border-slate-700/60 transition-all duration-200 px-3 py-1.5 text-sm font-medium hover:bg-amber-400/90 hover:text-black hover:border-amber-400/50">
              Submit to AI
            </button>
          )}

          {/* DETAILS - only when AI complete */}
          {isAIComplete && (
            <button
              onClick={onDetails}
              className="rounded-md bg-slate-800/80 text-slate-200 border border-slate-700/60 transition-all duration-200 px-3 py-1.5 text-sm font-medium hover:bg-amber-400/90">
              Details
            </button>
          )}

          {/* RETRY - AI failed only (worker failures are permanent) */}
          {isAIFailed && (
            <button
              onClick={onSubmit}
              className="rounded-md bg-slate-800/80 text-slate-200 border border-slate-700/60 transition-all duration-200 px-3 py-1.5 text-sm font-medium hover:border-slate-600">
              Retry
            </button>
          )}

          {/* DELETE - available after worker completes (not during preprocessing) */}
          {!isWorkerProcessing && (
            <button
              onClick={onDelete}
              className="rounded-md bg-slate-800/80 text-slate-200 border border-slate-700/60 transition-all duration-200 px-3 py-1.5 text-sm font-medium hover:bg-red-500/80 hover:text-white hover:border-red-500/50">
              Delete
            </button>
          )}
        </div>
      </div>

      {/* METADATA */}
      <div className="p-3 space-y-1">
        <p className="text-sm font-medium text-white truncate">{pdf.originalName}</p>
        <p className="text-xs text-neutral-400">{(pdf.size / 1024 / 1024).toFixed(2)} MB</p>
        <p className="text-xs text-neutral-500">Created on: {createdDate.toLocaleString("en-GB")}</p>

        {/* STATUS LABELS */}
        {isWorkerFailed && <p className="text-xs text-red-400 mt-1">Preprocessing failed</p>}
        {isAIFailed && <p className="text-xs text-red-400 mt-1">AI processing failed</p>}
      </div>
    </div>
  );
}
