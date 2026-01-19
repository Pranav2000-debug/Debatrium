import { User } from "../models/User.js";
import { asyncHandler, ApiError, ApiResponse } from "../utils/utilBarrel.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sendEmail } from "../mail/mailgen.js";
import { isValidEmail, isValidPassword } from "../regex/regexRules.js";
import { emailVerificationMailgenContent, forgotPasswordMailgenContent } from "../mail/mailgencontent.js";

// util func
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "No user found!");
    }
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save();
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error generating access and refresh token");
  }
};

export const signup = asyncHandler(async (req, res) => {
  const { fullname, username, email, password } = req.body;
  
  if (await User.findOne({ $or: [{ email: email.toLocaleLowerCase().trim() }, { username: username.toLocaleLowerCase().trim() }] }))
    throw new ApiError(409, "User with email or username already exists!");

  const user = await User.create({
    username: username.toLowerCase(),
    email: email.toLowerCase(),
    fullname,
    password,
  });

  const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpiry = tokenExpiry;
  await user.save();

  // rollback on error (think also transactions)
  try {
    await sendEmail({
      email: user?.email,
      subject: "Please verify your email",
      mailgenContent: emailVerificationMailgenContent(
        user?.username,
        `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unHashedToken}`
      ),
    });
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    throw new ApiError(500, "Failed to register user and send mail, please retry.");
  }

  const createdUser = await User.findById(user._id).select("-refreshToken -fullname -emailVerificationExpiry -emailVerificationToken");
  if (!createdUser) throw new ApiError(500, "Something went wrong while user registration");

  return res.status(201).json(new ApiResponse(200, { user: createdUser }, "User registered successfully"));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if ([email, password].some((field) => !field || field?.trim() === "")) {
    throw new ApiError(400, "All fields are required to be filled.");
  }
  if (typeof email !== "string" || typeof password !== "string") {
    throw new ApiError(400, "Invalid input type");
  }
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select("+password");
  if (!user) throw new ApiError(400, "Invalid email or user does not exist.");

  const isPasswordCorrect = await user.matchPassword(password);
  if (!isPasswordCorrect) throw new ApiError(401, "Invalid credentials");

  if (!user.isEmailVerified) {
    // token exists AND still valid
    if (user.emailVerificationToken && user.emailVerificationExpiry > Date.now()) {
      throw new ApiError(403, "Please verify your email. Check your inbox for the verification link.");
    }

    // token missing or expired -> regenerate
    const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();

    // update tokens and resend email
    user.emailVerificationToken = hashedToken;
    user.emailVerificationExpiry = tokenExpiry;
    await user.save();

    await sendEmail({
      email: user.email,
      subject: "Please verify your email",
      mailgenContent: emailVerificationMailgenContent(
        user.username,
        `${req.protocol}://${req.get("host")}/api/v1/auth/verify-email/${unHashedToken}`
      ),
    });

    throw new ApiError(403, "Verification email expired. A new one has been sent.");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

  const loggedInUser = await User.findById(user._id).select("-refreshToken -emailVerificationToken -emailVerificationExpiry");

  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, { ...opts, maxAge: 15 * 60 * 1000 }) // 15 minutes
    .cookie("refreshToken", refreshToken, { ...opts, maxAge: 7 * 24 * 60 * 60 * 1000 }) // 7 days
    .json(new ApiResponse(200, { user: loggedInUser }, "LOGGED IN"));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  // req.user is already attached by verifyJwtOptional middleware (can be null)
  return res.status(200).json(new ApiResponse(200, { user: req.user }, "User data retrieved"));
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { verificationToken } = req.params;

  if (!verificationToken) {
    throw new ApiError(400, "email verification token is missing");
  }
  if (typeof verificationToken !== "string") {
    throw new ApiError(400, "Invalid token format");
  }

  let hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    emailVerificationExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(401, "Token is invalid or has expired, please resend verification email");
  }

  user.emailVerificationToken = undefined;
  user.emailVerificationExpiry = undefined;
  user.isEmailVerified = true;
  await user.save();

  return res.status(200).json(new ApiResponse(200, "Email is verified"));
});

export const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: null,
      },
    },
    { new: true }
  );

  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  };
  return res.status(200).clearCookie("accessToken", opts).clearCookie("refreshToken", opts).json(new ApiResponse(200, {}, "Logged out successfully"));
});

export const checkAvailability = asyncHandler(async (req, res) => {
  const { username } = req.query;
  if (typeof username !== "string") {
    throw new ApiError(400, "Invalid username type");
  }
  if (!username) {
    throw new ApiError(400, "Username is required");
  }

  const normalizedUsername = username.trim();

  const usernameExists = await User.findOne({ username: normalizedUsername });

  return res.status(200).json({
    usernameAvailability: !usernameExists,
  });
});

export const forgotPaswordRequest = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (typeof email !== "string") {
    throw new ApiError("Invalid input type");
  }
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(200).json(new ApiResponse(200, {}, "If a user with that email exists, a reset password mail has been sent"));
  }

  const { unHashedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();

  user.forgotPasswordToken = hashedToken;
  user.forgotPasswordExpiry = tokenExpiry;

  await user.save({ validateBeforeSave: false });

  await sendEmail({
    email: user.email,
    subject: "Password reset request",
    mailgenContent: forgotPasswordMailgenContent(user.username, `${process.env.CLIENT_URL}/reset-password/${unHashedToken}`),
  });

  return res.status(200).json(new ApiResponse(200, {}, "If a user with that email exists, a reset password mail has been sent"));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { resetPasswordToken } = req.params;
  const { newPassword } = req.body;

  if (typeof resetPasswordToken !== "string") {
    throw new ApiError(400, "Invalid token");
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    throw new ApiError(400, "Password must be at least 8 characters");
  }
  let hashedToken = crypto.createHash("sha256").update(resetPasswordToken).digest("hex");

  const user = await User.findOne({
    forgotPasswordToken: hashedToken,
    forgotPasswordExpiry: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(401, "token is invalid or expired, please retry");
  }

  user.forgotPasswordExpiry = undefined;
  user.forgotPasswordToken = undefined;
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, {}, "Password changed successfully"));
});

export const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { currentPassword, newPassword } = req.body;

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    throw new ApiError(400, "Invalid input");
  }

  if (!isValidPassword(newPassword)) {
    throw new ApiError(400, "Password must be at least 8 characters and include uppercase, lowercase, and a special character");
  }

  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new ApiError(401, "Unauthorized");
  }

  const isMatch = await user.matchPassword(currentPassword);

  if (!isMatch) {
    throw new ApiError(400, "Current password is incorrect");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, {}, "Password updated successfully"));
});


export const changeUsername = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { newUsername } = req.body;

  if (typeof newUsername !== "string") {
    throw new ApiError(400, "Invalid input");
  }

  const trimmedUsername = newUsername.trim().toLowerCase();

  if (trimmedUsername.length < 4) {
    throw new ApiError(400, "Username must be at least 3 characters long");
  }

  const usernameRegex = /^[a-z0-9_]+$/;
  if (!usernameRegex.test(trimmedUsername)) {
    throw new ApiError(400, "Username can only contain lowercase letters, numbers, and underscores");
  }

  // Check availability
  const existingUser = await User.findOne({
    username: trimmedUsername,
    _id: { $ne: userId },
  });

  if (existingUser) {
    throw new ApiError(409, "Username is already taken");
  }

  const user = await User.findByIdAndUpdate(userId, { username: trimmedUsername }, { new: true }).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(401, "Unauthorized");
  }

  return res.status(200).json(new ApiResponse(200, { user }, "Username updated successfully"));
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.header("Authorization")?.replace("Bearer ", "");

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized - Refresh token missing");
  }

  try {
    const decodedRefreshToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodedRefreshToken._id);

    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token - User not found");
    }

    // Check if the refresh token matches the one stored in DB
    if (user.refreshToken !== incomingRefreshToken) {
      throw new ApiError(401, "Refresh token has expired or has been revoked");
    }

    // Generate new access and refresh tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    const opts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 15 * 60 * 1000, // 15 minutes for access token
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, opts)
      .cookie("refreshToken", refreshToken, { ...opts, maxAge: 7 * 24 * 60 * 60 * 1000 }) // 7 days for refresh token
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(401, "Invalid Refresh Token");
  }
});
