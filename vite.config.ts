import { defineConfig } from "vite";
import { resolve } from "path";
import { readdirSync } from "fs";
import { DevMiddleware } from "./frontend/src/build/devMiddleware";
import { BuildHooks } from "./frontend/src/build/buildHooks";

// Function to discover all HTML and TypeScript files in the pages directory and snippets
function getPageEntries() {
  const pagesDir = resolve(__dirname, "frontend/src/pages");
  const snippetsDir = resolve(__dirname, "frontend/src/snippets");
  const globalDir = resolve(__dirname, "frontend/src/global");
  const entries: Record<string, string> = {};
  
  try {
    // Add global.ts entry
    const globalTsFile = resolve(globalDir, "global.ts");
    if (require("fs").existsSync(globalTsFile)) {
      entries["global"] = globalTsFile;
    }
    
    // Add page entries
    const pageDirectories = readdirSync(pagesDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const pageDir of pageDirectories) {
      const htmlFile = resolve(pagesDir, pageDir, `${pageDir}.html`);
      const tsFile = resolve(pagesDir, pageDir, `${pageDir}.ts`);
      
      // Add HTML file as entry point
      entries[pageDir] = htmlFile;
      
      // Add TypeScript file as entry point for JS generation
      entries[`${pageDir}-ts`] = tsFile;
    }
    
    // Add snippet entries
    const snippetDirectories = readdirSync(snippetsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const snippetDir of snippetDirectories) {
      const tsFile = resolve(snippetsDir, snippetDir, `${snippetDir}.ts`);
      
      // Check if TypeScript file exists
      try {
        if (require("fs").existsSync(tsFile)) {
          // Add TypeScript file as entry point for JS generation
          entries[`snippet-${snippetDir}`] = tsFile;
        }
      }
      catch {
        // Ignore if file doesn't exist
      }
    }
  }
  catch (error) {
    console.warn("Could not read directories:", error);
  }
  
  return entries;
}

export default defineConfig({
  root: "frontend/src",
  

  
  server: {
    port: 5173,
    open: false,
    middlewareMode: false,
    proxy: {
      // Proxy API requests to the backend server
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      // Proxy other backend routes
      "/join": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "/settings": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "/about": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "/feedback": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "/main": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "/homework": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "/events": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "/report": {
        target: "http://localhost:3000",
        changeOrigin: true
      }
    },
    fs: {
      // Allow serving files from vendor directory
      allow: [
        resolve(__dirname, "frontend/src"),
        resolve(__dirname, "frontend/src/vendor"),
        resolve(__dirname, "frontend/public")
      ]
    }
  },
  
  resolve: {
    alias: {
      // Set up aliases for vendor libraries
      "@vendor": resolve(__dirname, "frontend/src/vendor"),
      "@assets": resolve(__dirname, "frontend/src/assets"),
      "@snippets": resolve(__dirname, "frontend/src/snippets"),
      "@global": resolve(__dirname, "frontend/src/global"),
      // Map vendor libraries for proper resolution
      "jquery": resolve(__dirname, "frontend/src/vendor/jquery/jquery.min.js"),
      "bootstrap": resolve(__dirname, "frontend/src/vendor/bootstrap/bootstrap.bundle.min.js"),
      "qrcode": resolve(__dirname, "frontend/src/vendor/qrcode/qrcode.min.js")
    }
  },
  
  optimizeDeps: {
    // Exclude vendor files from dependency optimization
    exclude: [
      "frontend/src/vendor/socket/socket.io.esm.min.js",
      "frontend/src/vendor/jquery/jquery.min.js",
      "frontend/src/vendor/bootstrap/bootstrap.bundle.min.js",
      "frontend/src/vendor/qrcode/qrcode.min.js"
    ]
  },
  
  build: {
    outDir: "../dist",
    emptyOutDir: true,
    assetsDir: "assets",
    // Maintain the existing file structure
    rollupOptions: {
      input: getPageEntries(),
      external: [
        // Treat vendor files as external to avoid parsing issues
        /^\/vendor\//
      ],
      output: {
        entryFileNames: chunkInfo => {
          // Handle global entry
          if (chunkInfo.name === "global") {
            return "global/global.js";
          }
          // Handle TypeScript entries - remove the '-ts' suffix and place in page directory
          if (chunkInfo.name?.endsWith("-ts")) {
            const pageName = chunkInfo.name.replace("-ts", "");
            return `pages/${pageName}/${pageName}.js`;
          }
          // Handle snippet entries
          if (chunkInfo.name?.startsWith("snippet-")) {
            const snippetName = chunkInfo.name.replace("snippet-", "");
            return `snippets/${snippetName}/${snippetName}.js`;
          }
          // Handle other entries
          return "[name]/[name].js";
        },
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: assetInfo => {
          if (/\.(css)$/.test(assetInfo.name || "")) {
            // Extract page name from CSS file and place in page directory
            const baseName = assetInfo.name?.replace(/\.(css)$/, "") || "";
            if (baseName.endsWith("-ts")) {
              const pageName = baseName.replace("-ts", "");
              return `pages/${pageName}/${pageName}.css`;
            }
            return `pages/${baseName}/${baseName}.css`;
          }
          
          return "assets/[name]-[hash].[ext]";
        }
      }
    }
  },
  
  css: {
    preprocessorOptions: {
      scss: {
        // Include paths for SCSS imports
        includePaths: [
          resolve(__dirname, "frontend/src"),
          resolve(__dirname, "frontend/src/global"),
          resolve(__dirname, "frontend/src/snippets")
        ]
      }
    }
  },
  
  // Copy static assets
  publicDir: resolve(__dirname, "frontend/public"),
  
  // Ensure vendor files are treated as static assets
  assetsInclude: ["**/*.min.js", "**/*.min.js.map", "**/*.d.ts"],
  
  plugins: [
    // Custom plugin for HTML processing and development server
    {
      name: "html-processor",
      async configureServer(server) {
        // Set up development middleware
        const middleware = new DevMiddleware(server, {
          sourceDir: resolve(__dirname, "frontend/src"),
          outputDir: resolve(__dirname, "frontend/dist")
        });
        
        await middleware.setup();
        console.log("Development server middleware configured");
      },
      
      async writeBundle() {
        // Process HTML files after Vite has written them
        const buildHooks = new BuildHooks({
          sourceDir: resolve(__dirname, "frontend/src"),
          outputDir: resolve(__dirname, "frontend/dist"),
          mode: "production"
        });
        
        // Copy vendor, static, and additional assets first
        await buildHooks.copyVendorAssets();
        await buildHooks.copyStaticAssets();
        await buildHooks.copyAssets();
        
        // Update manifest with correct asset references
        await buildHooks.updateManifestAssetReferences();
        
        // Then process all HTML files
        await buildHooks.processAllHtmlFiles();
        
        console.log("HTML processing completed during build");
      }
    }
  ]
});