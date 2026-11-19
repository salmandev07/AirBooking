import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dev server runs on 5173 and proxies /api to Django on 8000,
// so we do not have to fight with CORS while developing.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
});
