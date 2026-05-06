import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV !== "production";

function writeDevServerInfo() {
  return {
    name: "write-dev-server-info",
    configureServer(server) {
      server.httpServer?.once("listening", () => {
        const address = server.httpServer.address();
        const out = { host: "localhost", port: address.port };
        fs.writeFileSync(
          path.resolve(__dirname, "vite-dev.json"),
          JSON.stringify(out),
        );
      });
    },
  };
}

export default {
  root: "./",
  base: isDev ? "http://localhost:5173/" : "/static/",
  plugins: [react(), ...(isDev ? [writeDevServerInfo()] : [])],
  server: {
    host: "localhost",
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "../static/",
    manifest: true,
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        slb_pricer: path.resolve(__dirname, "applets/slb_pricer/src/main.jsx"),
        styles: path.resolve(__dirname, "css/styles.js"),
      },
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  resolve: {
    alias: {
      "@slb": path.resolve(__dirname, "applets/slb_pricer/src"),
      "@slb_components": path.resolve(__dirname, "applets/slb_pricer/src/components"),
      "@slb_store": path.resolve(__dirname, "applets/slb_pricer/src/store"),
      "@scss": path.resolve(__dirname, "css"),
    },
  },
};
