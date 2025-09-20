import { ViteDevServer } from "vite";
import { resolve } from "path";
import { readFile, exists } from "fs-extra";
import { HtmlProcessor, BuildContext } from "./HtmlProcessor";
import { glob } from "glob";

export interface DevMiddlewareOptions {
  sourceDir: string
  outputDir: string
}

export class DevMiddleware {
  private server: ViteDevServer;
  private options: DevMiddlewareOptions;
  private snippetDependencies: Map<string, Set<string>> = new Map();

  constructor(server: ViteDevServer, options: DevMiddlewareOptions) {
    this.server = server;
    this.options = options;
  }

  async setup() {
    // Set up HTML processing middleware
    this.server.middlewares.use("/pages", async (req, res, next) => {
      if (req.url?.endsWith(".html")) {
        try {
          const filePath = resolve(this.options.sourceDir, req.url.slice(1));

          if (await exists(filePath)) {
            const content = await readFile(filePath, "utf8");

            const context: BuildContext = {
              mode: "development",
              sourceDir: this.options.sourceDir,
              outputDir: this.options.outputDir,
              snippetCache: new Map(),
              processedFiles: new Set()
            };

            const processor = new HtmlProcessor(context);
            const processedHtml = await processor.processHtml(filePath, content);

            res.setHeader("Content-Type", "text/html");
            res.setHeader("Cache-Control", "no-cache");
            res.end(processedHtml);
            return;
          }
        }
        catch (error) {
          console.error("Error processing HTML:", error);
        }
      }
      next();
    });

    // Set up vendor asset serving
    this.server.middlewares.use("/vendor", async (req, res, next) => {
      try {
        const filePath = resolve(this.options.sourceDir, "vendor", req.url!.slice(1));

        if (await exists(filePath)) {
          const content = await readFile(filePath);

          // Set appropriate content type
          const ext = filePath.split(".").pop()?.toLowerCase();
          switch (ext) {
          case "js":
            res.setHeader("Content-Type", "application/javascript");
            break;
          case "css":
            res.setHeader("Content-Type", "text/css");
            break;
          case "map":
            res.setHeader("Content-Type", "application/json");
            break;
          }

          res.setHeader("Cache-Control", "public, max-age=31536000");
          res.end(content);
          return;
        }
      } 
      catch (error) {
        console.error("Error serving vendor asset:", error);
      }
      next();
    });

    // Set up static asset serving
    this.server.middlewares.use("/static", async (req, res, next) => {
      try {
        const filePath = resolve(this.options.sourceDir, "static", req.url!.slice(1));

        if (await exists(filePath)) {
          const content = await readFile(filePath);

          // Set appropriate content type
          const ext = filePath.split(".").pop()?.toLowerCase();
          switch (ext) {
          case "ico":
            res.setHeader("Content-Type", "image/x-icon");
            break;
          case "json":
            res.setHeader("Content-Type", "application/json");
            break;
          case "png":
            res.setHeader("Content-Type", "image/png");
            break;
          case "svg":
            res.setHeader("Content-Type", "image/svg+xml");
            break;
          }

          res.setHeader("Cache-Control", "public, max-age=31536000");
          res.end(content);
          return;
        }
      } 
      catch (error) {
        console.error("Error serving static asset:", error);
      }
      next();
    });

    // Watch snippet files and build dependency map
    await this.setupSnippetWatching();
  }

  private async setupSnippetWatching() {
    // Watch all snippet files
    const snippetPatterns = [
      resolve(this.options.sourceDir, "snippets/**/*.html"),
      resolve(this.options.sourceDir, "snippets/**/*.ts"),
      resolve(this.options.sourceDir, "snippets/**/*.scss")
    ];

    for (const pattern of snippetPatterns) {
      const files = await glob(pattern);
      files.forEach(file => {
        this.server.watcher.add(file);
      });
    }

    // Build initial dependency map
    await this.buildSnippetDependencyMap();

    // Handle file changes
    this.server.watcher.on("change", async file => {
      if (file.includes("/snippets/")) {
        console.log(`Snippet file changed: ${file}`);

        // Rebuild dependency map
        await this.buildSnippetDependencyMap();

        // Trigger reload for affected pages
        this.server.ws.send({
          type: "full-reload"
        });
      }
    });

    // Handle new files
    this.server.watcher.on("add", async file => {
      if (file.includes("/snippets/")) {
        console.log(`New snippet file added: ${file}`);
        this.server.watcher.add(file);
        await this.buildSnippetDependencyMap();
      }
    });

    // Handle deleted files
    this.server.watcher.on("unlink", async file => {
      if (file.includes("/snippets/")) {
        console.log(`Snippet file deleted: ${file}`);
        await this.buildSnippetDependencyMap();

        this.server.ws.send({
          type: "full-reload"
        });
      }
    });
  }

  private async buildSnippetDependencyMap() {
    this.snippetDependencies.clear();

    try {
      // Find all HTML files (pages and snippets)
      const htmlFiles = await glob(resolve(this.options.sourceDir, "**/*.html"));

      for (const htmlFile of htmlFiles) {
        const content = await readFile(htmlFile, "utf8");
        const dependencies = this.extractSnippetDependencies(content);

        const relativePath = htmlFile.replace(this.options.sourceDir, "");
        this.snippetDependencies.set(relativePath, dependencies);
      }
    } 
    catch (error) {
      console.error("Error building snippet dependency map:", error);
    }
  }

  private extractSnippetDependencies(htmlContent: string): Set<string> {
    const dependencies = new Set<string>();

    // Match load-snippet divs
    const snippetRegex = /<div[^>]*class="[^"]*load-snippet[^"]*"[^>]*data-target="([^"]+)"[^>]*>/g;
    let match;

    while ((match = snippetRegex.exec(htmlContent)) !== null) {
      dependencies.add(match[1]);
    }

    return dependencies;
  }

  getSnippetDependencies(filePath: string): Set<string> {
    return this.snippetDependencies.get(filePath) || new Set();
  }
}