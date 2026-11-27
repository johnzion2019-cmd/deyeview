import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

const deyeProxy = {
  "/deye-eu": {
    target: "https://eu1-developer.deyecloud.com",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/deye-eu/, ""),
  },
  "/deye-us": {
    target: "https://us1-developer.deyecloud.com",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/deye-us/, ""),
  },
  "/meteo": {
    target: "https://api.open-meteo.com",
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/meteo/, ""),
  },
};

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 43117,
    strictPort: true,
    proxy: deyeProxy,
  },
  preview: {
    host: "0.0.0.0",
    port: 43117,
    strictPort: true,
    proxy: deyeProxy,
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
