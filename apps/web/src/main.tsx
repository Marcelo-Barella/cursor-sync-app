import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyApiQueryParamFromLocation } from "./lib/apiBase";
import { AuthProvider, bootstrapAuthFromStorage } from "./lib/authStore";
import { applyThemePreference } from "./lib/theme";
import "./styles/global.css";

applyApiQueryParamFromLocation();
bootstrapAuthFromStorage();
applyThemePreference();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>
);
