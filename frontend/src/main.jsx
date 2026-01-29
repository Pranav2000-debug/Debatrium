import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route } from "react-router-dom";
import "./index.css";

import Layout from "./Layout";
import Home from "./pages/Home";
import { AuthProvider } from "./context/AuthContext";
import PublicOnlyRoutes from "./routes/PublicOnlyRoutes";
import ProtectedRoutes from "./routes/ProtectedRoutes";
import { PdfProvider } from "./context/PdfContext";
import DashboardLayout from "./components/Dashboard/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import { LoaderFive } from "./components/ui/loader";

// Lazy-loaded pages (only loaded when user navigates to them)
const AboutUs = lazy(() => import("./pages/AboutUs"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/SignUp"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const AiSummary = lazy(() => import("./pages/AiSummary"));
const Profile = lazy(() => import("./pages/Profile"));

// Suspense fallback for lazy-loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-neutral-950">
    <LoaderFive text="Loading..." />
  </div>
);

const router = createBrowserRouter(
  createRoutesFromElements(
    <>
      {/* PUBLIC LAYOUT */}
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<Suspense fallback={<PageLoader />}><AboutUs /></Suspense>} />
        <Route path="reset-password/:resetPasswordToken" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />

        <Route element={<PublicOnlyRoutes />}>
          <Route path="login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
          <Route path="signup" element={<Suspense fallback={<PageLoader />}><Signup /></Suspense>} />
        </Route>
      </Route>

      {/* DASHBOARD (NO NAVBAR) */}
      <Route element={<ProtectedRoutes />}>
        <Route element={<PdfProvider />}>
          <Route path="dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="pdf/:publicId" element={<Suspense fallback={<PageLoader />}><AiSummary /></Suspense>}></Route>
            <Route path="profile" element={<Suspense fallback={<PageLoader />}><Profile /></Suspense>} />
          </Route>
        </Route>
      </Route>
    </>
  )
);

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
);
