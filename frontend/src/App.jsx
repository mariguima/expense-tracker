import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import PageLayout from "./components/layout/PageLayout.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import SignupPage from "./pages/SignupPage.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";

const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const ExpensesPage = lazy(() => import("./pages/ExpensesPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={null}><Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route element={<PageLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes></Suspense>
    </BrowserRouter>
  );
}
