import express from "express";
import { getMyPdfs, getSinglePdf, markPdfAsConsumed, getPdfStatus } from "../controllers/pdf.controller.js";
import { verifyJwt } from "../middleware/authMiddleware.js";
import { submitPdfToAI } from "../controllers/submitPdf.controller.js";

const pdfRouter = express.Router();

pdfRouter.get("/", verifyJwt, getMyPdfs);
pdfRouter.get("/:id", verifyJwt, getSinglePdf);
pdfRouter.get("/:id/status", verifyJwt, getPdfStatus); // Lightweight polling endpoint
pdfRouter.post("/:id/submit", verifyJwt, submitPdfToAI);
pdfRouter.patch("/:id/consume", verifyJwt, markPdfAsConsumed);

export default pdfRouter;


/**
 * Frontend polling has not yet been finalized for the PDF status endpoint. Backend will logic for polling will remain.
 * Frotend will be updated accordingly.
 */