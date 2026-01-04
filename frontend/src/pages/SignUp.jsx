/* eslint-disable no-unused-vars */
import React, { useState, useRef, useCallback } from "react";
import api from "../api/axiosCongfig.js";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useUsernameAvailability } from "../hooks/usernameAvailibility";
import { handleApiError } from "../utils/handleApiError";

const Signup = () => {
  const navigate = useNavigate();
  const { status: usernameStatus, checkUsername, reset } = useUsernameAvailability();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullname: "",
    username: "",
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "username") {
      const trimmed = value.trim();

      // too short → stop checking + clear state
      if (trimmed.length < 4) {
        reset();
        return;
      }
      checkUsername(trimmed);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { fullname, username, email, password } = formData;

    // -------- Frontend sanity checks --------

    if (!fullname.trim() || !username.trim() || !email.trim() || !password.trim()) {
      toast.error("All fields are required.");
      setIsSubmitting(false);
      return;
    }

    // fullname: letters and spaces only
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(fullname)) {
      toast.error("Full name can only contain letters and spaces.");
      setIsSubmitting(false);
      return;
    }

    // username: basic length check (backend will enforce uniqueness)
    if (username.length < 4) {
      toast.error("Username must be at least 3 characters.");
      setIsSubmitting(false);
      return;
    }

    // email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Please enter a valid email address.");
      setIsSubmitting(false);
      return;
    }

    // password constraints (keep light; backend is authority)
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      setIsSubmitting(false);
      return;
    }

    // -------- API call --------

    try {
      const res = await api.post("/auth/sign-up", { fullname, username, email, password });
      toast.success("Signup successful! Please verify your email.");
      navigate("/login");
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full bg-gray-800 p-8 rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold text-white text-center mb-6">Sign Up</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-300 mb-1">Full Name</label>
            <input
              type="text"
              name="fullname"
              value={formData.fullname}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-1">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
            {usernameStatus === "checking" && <p className="text-sm text-gray-400 mt-1">Checking username…</p>}

            {usernameStatus === "available" && <p className="text-sm text-green-400 mt-1">Username available ✓</p>}

            {usernameStatus === "taken" && <p className="text-sm text-red-400 mt-1">Username already taken</p>}
          </div>

          <div>
            <label className="block text-gray-300 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-yellow-400 text-black font-semibold py-2 rounded-lg hover:bg-yellow-300 transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center">
            {isSubmitting ? (
              <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <p className="text-gray-400 text-sm mt-4 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-yellow-400 hover:text-yellow-300">
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;
