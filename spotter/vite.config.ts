/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

// Relative base so the same build works at a domain root, on GitHub Pages under
// /Pushup_Ai/, or served from the booth laptop with no internet.
// `npm run dev:phone` adds a self-signed certificate: phones only allow the
// camera on https, so this is how to test on a phone over the local Wi-Fi.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: [react(), tailwindcss(), ...(mode === "phone" ? [basicSsl()] : [])],
  build: {
    target: "es2022",
    sourcemap: true,
    chunkSizeWarningLimit: 1200,
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
}));
