import express from "express";
import { signup, login, logout, checkAvailability, verifyEmail, forgotPaswordRequest, resetPassword } from "../controllers/userController.js";
import { verifyJwt } from "../middleware/authMiddleware.js";
import { forgotPasswordLimiter, loginLimiter, signupLimiter, usernameCheckLimiter, verifyEmailLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../zod/validate.js";
import { signupSchema } from "../zod/userSchemas/user.schema.js";

const authRouter = express.Router();

// public
// user auth related routes
authRouter.post("/sign-up", validate(signupSchema()),signupLimiter, signup);
authRouter.post("/log-in", loginLimiter ,login);
authRouter.get("/verify-email/:verificationToken", verifyEmailLimiter ,verifyEmail);
authRouter.get("/check-availability", usernameCheckLimiter, checkAvailability);
// user auth password related routes
authRouter.post("/forgot-password", forgotPasswordLimiter, forgotPaswordRequest )
authRouter.post("/reset-password/:resetPasswordToken", resetPassword);


// protected routes
authRouter.post("/logout", verifyJwt, logout);

export default authRouter;
