// build cache bust: 2026-09-14 video-hero landing
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          runtimeErrorOverlay(),
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime
          "vendor-react": ["react", "react-dom"],
          // Data fetching
          "vendor-query": ["@tanstack/react-query"],
          // Radix UI is left to Vite: each page only loads the parts it uses
          // (one big shared chunk was loaded on every first page).
          // Utilities
          "vendor-utils": ["wouter", "lucide-react", "date-fns", "clsx", "tailwind-merge", "class-variance-authority"],
          // Charts (heavy — isolated so pages that don't use it don't pay the cost)
          "vendor-charts": ["recharts"],
        },
      },
    },
  },
});
