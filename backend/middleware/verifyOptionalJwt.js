import { User } from "../models/User.js";
import { asyncHandler, ApiError } from "../utils/utilBarrel.js";
import jwt from "jsonwebtoken";

/**
 * Optional JWT verification middleware
 * Authenticates user if token is valid, but doesn't fail if token is missing/invalid
 * Useful for endpoints that can serve both authenticated and anonymous users
 */
export const verifyJwtOptional = asyncHandler(async (req, res, next) => {
  const token = req.cookies.accessToken || req.header("Authorization")?.replace("Bearer ", "");

  // If no token provided, just continue without authentication
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decodedAccessToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedAccessToken._id).select("-refreshToken -emailVerificationToken -emailVerificationExpiry");
    
    if (!user) {
      // Token is invalid, continue without user
      req.user = null;
      return next();
    }

    // Token is valid, attach user to request
    req.user = user;
    next();
  } catch (err) {
    // Token is expired or malformed, continue without user
    // The axios interceptor on frontend will handle token refresh
    req.user = null;
    next();
  }
});
