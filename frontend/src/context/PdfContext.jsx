import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { toast } from "react-hot-toast";
import api from "../api/axiosConfig.js";
import { handleApiError } from "@/utils/handleApiError";

const PdfContext = createContext(null);

const POLL_INTERVAL_MS = 5000; // 5 seconds

/**
 * PdfProvider - manages PDF state for authenticated routes
 * 
 * Key behaviors:
 * - Only fetches PDFs once (when Dashboard first mounts)
 * - Subsequent Dashboard navigations use cached state
 * - Upload/Delete/Submit update state directly (no refetch)
 * - Polls for preprocessing status updates (pending/processing → completed/failed)
 * - State clears on logout (provider unmounts with ProtectedRoutes)
 */
export function PdfProvider() {
  const [pdfs, setPdfs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  // Ref to hold current pdfs for polling (avoids stale closure)
  const pdfsRef = useRef(pdfs);
  pdfsRef.current = pdfs;

  // Fetch PDFs from API (only runs once)
  const fetchPdfs = useCallback(async () => {
    if (hasFetched) return;

    setLoading(true);
    try {
      const res = await api.get("/pdfs");
      setPdfs(res?.data?.data?.pdfs || []);
      setHasFetched(true);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  }, [hasFetched]);

  // Update a single PDF
  const updatePdf = useCallback((pdfId, updates) => {
    setPdfs((prev) =>
      prev.map((p) => (p._id === pdfId ? { ...p, ...updates } : p))
    );
  }, []);

  // Count PDFs that need polling (preprocessing in progress)
  const preprocessingCount = pdfs.filter(
    (p) => p.preprocessStatus === "pending" || p.preprocessStatus === "processing"
  ).length;

  // Poll for preprocessing status updates
  useEffect(() => {
    // Don't poll if no PDFs need it
    if (preprocessingCount === 0) return;

    const pollStatus = async () => {
      const currentPdfs = pdfsRef.current;
      const pollingPdfs = currentPdfs.filter(
        (p) => p.preprocessStatus === "pending" || p.preprocessStatus === "processing"
      );

      for (const pdf of pollingPdfs) {
        try {
          const res = await api.get(`/pdfs/${pdf._id}/status`);
          const { preprocessStatus, status } = res?.data?.data || {};

          // Only update if status changed
          if (preprocessStatus !== pdf.preprocessStatus || status !== pdf.status) {
            updatePdf(pdf._id, { preprocessStatus, status });
          }
        } catch (err) {
          // If PDF was deleted (e.g., duplicate detected by worker), remove from state
          if (err.response?.status === 404) {
            setPdfs((prev) => prev.filter((p) => p._id !== pdf._id));
            toast.error("Duplicate PDF detected - removed");
          }
          // Other errors silently ignored (network issues, etc.)
        }
      }
    };

    // Poll immediately on mount, then every interval
    pollStatus();
    const intervalId = setInterval(pollStatus, POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [preprocessingCount, updatePdf]);

  return (
    <PdfContext.Provider
      value={{
        pdfs,
        setPdfs,
        loading,
        fetchPdfs,
        updatePdf,
        hasFetched,
      }}
    >
      <Outlet />
    </PdfContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePdfs() {
  const context = useContext(PdfContext);
  if (!context) {
    throw new Error("usePdfs must be used within a PdfProvider");
  }
  return context;
}

