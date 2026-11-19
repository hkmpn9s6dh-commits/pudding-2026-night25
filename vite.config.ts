import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.VITE_BASE ?? "./",
  build: { outDir: "dist", assetsInlineLimit: 8192, cssCodeSplit: false },
});
