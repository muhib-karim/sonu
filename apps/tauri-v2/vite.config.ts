import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins = [
    react({
      // Enable Fast Refresh for better development experience
      fastRefresh: true,
      // JSX runtime optimization
      jsxRuntime: "automatic",
    }),
    tailwindcss(),
  ];

  // Add visualizer plugin in analyze mode (optional)
  if (mode === "analyze") {
    try {
      const { visualizer } = await import("rollup-plugin-visualizer");
      plugins.push(
        visualizer({
          open: true,
          gzipSize: true,
          brotliSize: true,
          filename: "dist/stats.html",
        }),
      );
    } catch {
      console.warn(
        "rollup-plugin-visualizer not installed. Skipping bundle analysis.",
      );
    }
  }

  return {
    plugins,

    // Path aliases for cleaner imports
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        "@/bindings": resolve(__dirname, "./src/bindings.ts"),
        "@/components": resolve(__dirname, "./src/components"),
        "@/lib": resolve(__dirname, "./src/lib"),
        "@/hooks": resolve(__dirname, "./src/hooks"),
        "@/store": resolve(__dirname, "./src/store"),
      },
    },

    // Build optimization
    build: {
      // Target modern browsers for smaller bundles
      target: "es2020",
      // Enable minification
      minify: "esbuild",
      // Generate source maps for debugging
      sourcemap: mode !== "production",
      // Optimize chunk size
      chunkSizeWarningLimit: 1000,
      // Rollup options for better bundling
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
          overlay: resolve(__dirname, "src/overlay/index.html"),
        },
        output: {
          // Manual chunk splitting for better caching
          manualChunks: {
            // Vendor libraries that change infrequently
            vendor: [
              "react",
              "react-dom",
              "react-i18next",
              "i18next",
              "zustand",
            ],
            // UI components
            ui: ["lucide-react", "sonner"],
            // Tauri plugins
            tauri: ["@tauri-apps/api", "@tauri-apps/plugin-store"],
          },
          // Optimize entry chunk size
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      },
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Assets inline threshold (8KB)
      assetsInlineLimit: 8192,
    },

    // Optimize dependencies
    optimizeDeps: {
      // Pre-bundle these dependencies for faster dev server startup
      include: [
        "react",
        "react-dom",
        "react-i18next",
        "i18next",
        "zustand",
        "lucide-react",
      ],
    },

    // Esbuild optimizations
    esbuild: {
      // Drop console logs in production
      drop: mode === "production" ? ["console", "debugger"] : [],
      // Optimize JSX
      jsx: "automatic",
      // Target modern JS
      target: "es2020",
    },

    // Vite options tailored for Tauri development
    clearScreen: false,

    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        // Ignore watching Rust files and build outputs
        ignored: ["**/src-tauri/**", "**/target/**", "**/dist/**"],
      },
      // Enable compression for dev server
      fs: {
        strict: true,
        allow: ["."],
      },
    },

    // Preview server configuration
    preview: {
      port: 1420,
      strictPort: true,
    },

    // CSS optimizations
    css: {
      // Enable CSS modules
      modules: {
        localsConvention: "camelCase",
      },
      // PostCSS configuration
      postcss: {
        plugins: [],
      },
      // Dev sourcemaps
      devSourcemap: true,
    },
  };
});
