import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PageLayout from "./components/layout/PageLayout.jsx";
import PageErrorBoundary from "./components/layout/PageErrorBoundary.jsx";
import ApiErrorRedirect from "./components/layout/ApiErrorRedirect.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";

const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));

export default function App() {
  return (
    <BrowserRouter>
      <ApiErrorRedirect />
      <PageErrorBoundary>
      <Suspense fallback={<div className="route-status" role="status">Loading your page…</div>}><Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<PageLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes></Suspense>
      </PageErrorBoundary>
    </BrowserRouter>
  );
}
