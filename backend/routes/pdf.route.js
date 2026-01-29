import express from "express";
import { getMyPdfs, getSinglePdf, markPdfAsConsumed, getPdfStatus } from "../controllers/pdf.controller.js";
import { verifyJwt } from "../middleware/authMiddleware.js";
import { submitPdfToAI } from "../controllers/submitPdf.controller.js";

const pdfRouter = express.Router();

// All routes use publicId (Cloudinary ID) instead of MongoDB _id
pdfRouter.get("/", verifyJwt, getMyPdfs);
pdfRouter.get("/:publicId", verifyJwt, getSinglePdf);
pdfRouter.get("/:publicId/status", verifyJwt, getPdfStatus);
pdfRouter.post("/:publicId/submit", verifyJwt, submitPdfToAI);
pdfRouter.patch("/:publicId/consume", verifyJwt, markPdfAsConsumed);

export default pdfRouter;


/**
 * Frontend polling has not yet been finalized for the PDF status endpoint. Backend will logic for polling will remain.
 * Frotend will be updated accordingly.
 */