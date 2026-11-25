import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { bootstrapApiBaseFromLocation } from "./lib/apiBaseSecurity";
import "./styles/global.css";

function mountApp(): void {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}

void bootstrapApiBaseFromLocation().then(mountApp);