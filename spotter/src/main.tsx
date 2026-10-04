import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import { ErrorBoundary } from "./ui/ErrorBoundary";
import { getData } from "./lib/store";
import { POSE_MODEL_PATHS, WASM_BASE_PATH } from "./vision/assetPaths.generated";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Offline support for the booth: cache the app and the pose model after the first visit.
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        // Files this first page load fetched before the worker took control,
        // plus the pose runtime and model a workout will need.
        const loaded = performance.getEntriesByType("resource").map((e) => e.name);
        const base = new URL(import.meta.env.BASE_URL, window.location.href);
        const wasm = ["vision_wasm_internal.js", "vision_wasm_internal.wasm"].map((f) => new URL(`${WASM_BASE_PATH}/${f}`, base).href);
        const urls = [new URL("./", base).href, ...loaded, ...wasm, new URL(POSE_MODEL_PATHS[getData().settings.model], base).href];
        const send = () => reg.active?.postMessage({ type: "cache", urls });
        if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(send, { timeout: 8000 });
        else setTimeout(send, 3000);
      })
      .catch(() => {
        // No service worker (private window, file://): the app still works online.
      });
  });
}
