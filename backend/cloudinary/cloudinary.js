import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
import fs from "fs"

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadPdfToCloudinary = async (filePath, originalName) => {
  try {
    if (!filePath) {
      throw new Error("Invalid file path for Cloudinary upload");
    }

    const uploadResult = await cloudinary.uploader.upload(filePath, {
      folder: "mwd-files",
      resource_type: "image", // PDFs are treated as images
      use_filename: true,
      filename_override: originalName,
      unique_filename: true,
      format: "pdf", // ensure PDF
    });

    return uploadResult;
  } catch (error) {
    console.error("PDF upload to Cloudinary failed:", error);
    throw error;
  } finally {
    // cleanup local file (diskStorage)
    fs.unlink(filePath, () => {});
  }
};
