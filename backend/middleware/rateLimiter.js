import rateLimit from "express-rate-limit";

/**
 * Global limiter
 * - Protects infra
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // very safe for prod
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Username availability check
 * - High frequency
 * - Enumeration risk
 */
export const usernameCheckLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // safe even with fast typing
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many login attempts. Please try again later.",
      code: "RATE_LIMITED",
    });
  },
});

/**
 * Login limiter
 * - Brute force protection
 * - Still allows human retries
 */
export const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 10, // PROD-safe
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Signup limiter
 * - Prevent spam accounts
 */
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 6, // safe for prod
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many signup attempts. Try again later",
      code: "RATE_LIMITED",
    });
  },
});

/**
 * Verify email limiter
 * - Low abuse risk
 */
export const verifyEmailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(200).json({
      success: true,
      message: "If a user with that email exists, a reset password mail has been sent",
    });
  },
});

export const updateUsernameLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, //  safe for prod ?? ehh
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Too many username change attempts. Please try again later.",
      code: "RATE_LIMITED",
    });
  },
});
