import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Backend Laravel (php artisan serve). Proxy membuat cookie sesi satu origin dengan frontend.
const backend = "http://localhost:8000";

export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": backend, "/sanctum": backend } },
});
