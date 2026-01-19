import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import userRouter from "./routes/userRoutes.js";
import authRouter from "./routes/auth.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { globalLimiter } from "./middleware/rateLimiter.js";
import uploadRouter from "./routes/upload.route.js";
import pdfRouter from "./routes/pdf.route.js";

const app = express();
app.set("trust proxy", 1);
app.use(globalLimiter);
// application level middlewares
app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? process.env.CLIENT_URL : "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS", "PATCH", "PUT"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());


// routes (API ENDPOINTS)

// AUTH ROUTES (HAS A PROTECTED LOGOUT ROUTE)
app.use("/api/v1/auth", authRouter);

// PROTECTED USER ROUTES
app.use("/api/v1/users", userRouter); // user dashboard protected routes
app.use("/api/v1/uploads", uploadRouter); // for uploading/deleting to/from cloud and db
app.use("/api/v1/pdfs", pdfRouter); // all pdf handling related routes



app.use(errorHandler);

export default app;
