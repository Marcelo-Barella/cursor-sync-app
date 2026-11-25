import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { bootstrapApiBaseFromLocation } from "./lib/apiBaseSecurity";
import "./styles/global.css";

bootstrapApiBaseFromLocation();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);