import React, { useRef, useState, useEffect } from "react";
import api from "../api/axiosConfig.js";
import UploadCard from "../components/Dashboard/UploadCard";
import PdfCard from "../components/Dashboard/PdfCard";
import { handleApiError } from "@/utils/handleApiError";
import { toast } from "react-hot-toast";
import { usePdfs } from "../context/PdfContext";
import { useNavigate } from "react-router-dom";
import { LoaderFive } from "@/components/ui/loader";

function Dashboard() {
  const fileInputRef = useRef(null);
  const { pdfs, setPdfs, loading, fetchPdfs } = usePdfs();
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();

  // Fetch PDFs on first Dashboard mount (skips if already fetched)
  useEffect(() => {
    fetchPdfs();
  }, [fetchPdfs]);

  const handleCardClick = () => {
    if (!uploading) fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Frontend guards
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      e.target.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      e.target.value = "";
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/uploads/pdf", formData);
      const uploadData = res?.data?.data?.pdf;
      if (!uploadData) throw new Error("Invalid upload response");
      setPdfs((prev) => [...prev, uploadData]);
      toast.success("PDF uploaded successfully");
    } catch (err) {
      handleApiError(err);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDeletePdf = async (publicId) => {
    // optimistic update
    const previousPdfs = pdfs;
    setPdfs((prev) => prev.filter((p) => p.publicId !== publicId));

    try {
      await api.delete(`/uploads/pdf/${encodeURIComponent(publicId)}`);

      toast.success("PDF deleted");
    } catch (err) {
      // rollback on failure
      setPdfs(previousPdfs);
      handleApiError(err);
    }
  };

  const handleSubmitToAI = async (pdfId) => {
    // Optimistic update - set AI status to processing
    setPdfs((prev) => prev.map((p) => (p._id === pdfId ? { ...p, status: "processing" } : p)));
    try {
      const AIRes = await api.post(`/pdfs/${pdfId}/submit`, {});
      const updatedPdf = AIRes?.data?.data?.pdf;
      setPdfs((prev) => prev.map((p) => (p._id === updatedPdf._id ? updatedPdf : p)));
      toast.success("AI Debate generated");
    } catch (error) {
      // rollback on error
      setPdfs((prev) => prev.map((p) => (p._id === pdfId ? { ...p, status: "failed" } : p)));
      handleApiError(error);
    }
  };

  const handleGoToDetails = (pdfId) => {
    navigate(`/dashboard/pdf/${pdfId}`);
  };

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-semibold text-white">Uploads</h1>
        <p className="text-sm text-neutral-400">Upload PDF files to process with AI</p>
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />

      {/* Cards grid */}
      {loading ? (
        <div className="flex items-center justify-center h-[60vh]">
          <LoaderFive text="Loading..." />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          <UploadCard onClick={handleCardClick} disabled={uploading} />
          {pdfs.map((pdf) => (
            <PdfCard
              key={pdf.publicId}
              pdf={pdf}
              onSubmit={() => handleSubmitToAI(pdf._id)}
              onDelete={() => handleDeletePdf(pdf.publicId)}
              onDetails={() => handleGoToDetails(pdf._id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
