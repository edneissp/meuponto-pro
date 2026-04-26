import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api/checkout": {
        target: "https://zhfzltrxhgdnwzfxnzxl.supabase.co/functions/v1/create-checkout",
        changeOrigin: true,
        rewrite: () => "",
      },
      "/api/test-mercadopago": {
        target: "https://zhfzltrxhgdnwzfxnzxl.supabase.co/functions/v1/test-mercadopago",
        changeOrigin: true,
        rewrite: () => "",
      },
      "/api/test-mercadopago-webhook": {
        target: "https://zhfzltrxhgdnwzfxnzxl.supabase.co/functions/v1/test-mercadopago-webhook",
        changeOrigin: true,
        rewrite: () => "",
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
