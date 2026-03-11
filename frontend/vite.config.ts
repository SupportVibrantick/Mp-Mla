import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: "/", // 👈 ADD THIS

  plugins: [react()],
  root: "client",

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },

  server: {
    port: 5173,
  },

  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
});
