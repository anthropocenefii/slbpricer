import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "@scss/main.scss";

let reactRoot = null;

function initialiseSLBPricer() {
  const container = document.getElementById("slb-pricer-app");
  if (!container) {
    console.error("Element with ID 'slb-pricer-app' not found.");
    return;
  }
  if (!reactRoot) {
    reactRoot = createRoot(container);
  }
  reactRoot.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

document.addEventListener("DOMContentLoaded", initialiseSLBPricer);

window.initialiseSLBPricer = initialiseSLBPricer;
