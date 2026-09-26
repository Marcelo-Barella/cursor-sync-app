import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { applyApiQueryParamFromLocation } from "./lib/apiBase";
import "./styles/global.css";

applyApiQueryParamFromLocation();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
