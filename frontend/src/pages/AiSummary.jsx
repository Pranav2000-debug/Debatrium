import { handleApiError } from "@/utils/handleApiError";
import api from "../api/axiosConfig.js";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

function AiSummary() {
  const { publicId } = useParams();
  const [singlePdf, setSinglePdf] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchPdf = async () => {
      try {
        const res = await api.get(`/pdfs/${encodeURIComponent(publicId)}`,
          { signal: controller.signal }
        );
        setSinglePdf(res?.data?.data?.pdf);
      } catch (err) {
        // Only handle error if not aborted
        if (err.name !== "CanceledError" && err.name !== "AbortError") {
          handleApiError(err);
        }
      }
    };
    fetchPdf();
    return () => {
      controller.abort();
    };
  }, [publicId]);

  // fire and forget call
  useEffect(() => {
    if (!publicId) return;

    api.patch(`/pdfs/${encodeURIComponent(publicId)}/consume`, {}).catch(() => {
      // silent failure — cleanup is best-effort
    });
  }, [publicId]);

  const gate = singlePdf?.aiResult?.gate;
  const analysis = singlePdf?.aiResult?.analysis;
  return (
    <div className="space-y-8">
      {/* ===== PDF SECTION ===== */}
      <section className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h2 className="text-lg font-semibold mb-2">Uploaded PDF</h2>

        <div className="flex items-center justify-between">
          {/* name of file here */}
          <span className="text-sm text-gray-300 truncate">{singlePdf?.originalName}</span>

          <button
            className="px-3 py-1 text-sm rounded bg-yellow-400 text-black hover:bg-yellow-300"
            onClick={() => window.open(singlePdf?.pdfUrl, "_blank")}>
            View PDF
          </button>
        </div>
      </section>

      {/* non a debate */}
      {gate && gate.isDebate === false && (
        <section className="rounded-lg border border-yellow-500 bg-yellow-500/10 p-4">
          <h2 className="text-lg font-semibold mb-2 text-yellow-400">Not Suitable for Debate</h2>
          <p className="mt-3 text-sm text-red-400">
            This file will be automatically removed from your dashboard after you leave this page to keep things tidy.
          </p>
          <p className="mb-2 text-sm text-gray-400">You can view and download the PDF now if you want to keep a copy.</p>

          <p className="text-sm text-gray-300">{gate.reason}</p>

          <p className="mt-2 text-xs text-gray-400">Confidence: {(gate.confidence * 100).toFixed(0)}%</p>
        </section>
      )}

      {/* ===== AI COUNTER DEBATE ===== */}
      {gate?.isDebate && analysis && (
        <>
          <section className="rounded-lg border border-gray-700 bg-gray-800 p-4">
            <h2 className="text-lg font-semibold mb-2">AI Counter Debate</h2>

            <p className="text-sm text-gray-300 leading-relaxed">
              {analysis?.counterDebate || "NO AI COUNTER DEBATE GENERATED"}
              <br />
              This section represents the opposing stance in the debate.
            </p>
          </section>

          {/* ===== AI ANALYSIS & FEEDBACK ===== */}
          <section className="rounded-lg border border-gray-700 bg-gray-800 p-4">
            <h2 className="text-lg font-semibold mb-4">AI Analysis</h2>

            <div className="space-y-3 text-sm text-gray-300">
              <div>
                <strong className="text-white">Strengths:</strong>
                <ul className="list-disc list-inside mt-1">
                  {analysis?.strengths?.length ? analysis.strengths.map((s, i) => <li key={i}>{s}</li>) : <li className="opacity-60">No data</li>}
                </ul>
              </div>

              <div>
                <strong className="text-white">Weaknesses:</strong>
                <ul className="list-disc list-inside mt-1">
                  {analysis?.weaknesses?.length ? analysis.weaknesses.map((w, i) => <li key={i}>{w}</li>) : <li className="opacity-60">No data</li>}
                </ul>
              </div>

              <div>
                <strong className="text-white">Grammar & Clarity:</strong>
                <ul className="list-disc list-inside mt-1">
                  {analysis?.grammarNotes?.length ? (
                    analysis.grammarNotes.map((g, i) => <li key={i}>{g}</li>)
                  ) : (
                    <li className="opacity-60">No data</li>
                  )}
                </ul>
              </div>

              <div>
                <strong className="text-white">Overall Rating:</strong>
                <p className="mt-1">{analysis?.rating ? `${analysis.rating} / 10` : "Not rated"}</p>
              </div>
            </div>
          </section>
          {/* ===== RELEVANT RESOURCES ===== */}
          <section className="rounded-lg border border-gray-700 bg-gray-800 p-4">
            <h2 className="text-lg font-semibold mb-2">Relevant Resources</h2>

            {analysis?.resources?.length ? (
              <ul className="space-y-2 text-sm text-gray-300">
                {analysis.resources.map((r, i) => (
                  <li key={i}>
                    •{" "}
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-yellow-400 hover:underline">
                      {r.title}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No resources suggested yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}

export default AiSummary;
