import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { RequireAuth } from "./components/RequireAuth";
import { LandingPage } from "./pages/LandingPage";
import { SignInPage } from "./pages/SignInPage";
import { SignUpPage } from "./pages/SignUpPage";
import { AuthContinuePage } from "./pages/AuthContinuePage";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";
import { AuthVerifyPage } from "./pages/AuthVerifyPage";
import { DeveloperPage } from "./pages/DeveloperPage";
import { AppShell } from "./pages/app/AppShell";
import { SettingsTab } from "./pages/app/SettingsTab";
import { SyncTab } from "./pages/app/SyncTab";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/sign-up" element={<SignUpPage />} />
        <Route path="/auth/continue" element={<AuthContinuePage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/auth/verify" element={<AuthVerifyPage />} />
        <Route path="/developer" element={<DeveloperPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<SyncTab />} />
            <Route path="settings" element={<SettingsTab />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
