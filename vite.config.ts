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
          // All Radix UI primitives
          "vendor-radix": [
            "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tooltip", "@radix-ui/react-tabs", "@radix-ui/react-select",
            "@radix-ui/react-accordion", "@radix-ui/react-alert-dialog",
            "@radix-ui/react-avatar", "@radix-ui/react-checkbox",
            "@radix-ui/react-collapsible", "@radix-ui/react-label",
            "@radix-ui/react-popover", "@radix-ui/react-progress",
            "@radix-ui/react-radio-group", "@radix-ui/react-scroll-area",
            "@radix-ui/react-separator", "@radix-ui/react-slider",
            "@radix-ui/react-switch", "@radix-ui/react-toggle", "@radix-ui/react-toggle-group",
          ],
          // Utilities
          "vendor-utils": ["wouter", "lucide-react", "date-fns", "clsx", "tailwind-merge", "class-variance-authority"],
          // Charts (heavy — isolated so pages that don't use it don't pay the cost)
          "vendor-charts": ["recharts"],
        },
      },
    },
  },
});
