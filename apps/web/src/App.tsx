import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { SignInPage } from "./pages/SignInPage";
import { SignUpPage } from "./pages/SignUpPage";
import { AuthContinuePage } from "./pages/AuthContinuePage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { DeveloperPage } from "./pages/DeveloperPage";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/auth/continue" element={<AuthContinuePage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/developer" element={<DeveloperPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
