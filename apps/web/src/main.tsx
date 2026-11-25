import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { bootstrapApiBaseFromLocation } from "./lib/apiBaseSecurity";
import { AuthProvider, bootstrapAuthFromStorage } from "./lib/authStore";
import { applyThemePreference } from "./lib/theme";
import "./styles/global.css";

function mountApp(): void {
  bootstrapAuthFromStorage();
  applyThemePreference();
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>
  );
}

void bootstrapApiBaseFromLocation().then(mountApp);