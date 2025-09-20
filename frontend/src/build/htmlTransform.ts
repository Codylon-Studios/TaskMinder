import { HtmlProcessor, BuildContext } from "./HtmlProcessor";
import { join } from "path";

/**
 * Creates a new HTML processor instance with the given configuration
 */
export function createHtmlProcessor(options: {
  mode: "development" | "production";
  sourceDir?: string;
  outputDir?: string;
}): HtmlProcessor {
  const context: BuildContext = {
    mode: options.mode,
    sourceDir: options.sourceDir || join(process.cwd(), "frontend/src"),
    outputDir: options.outputDir || join(process.cwd(), "frontend/dist"),
    snippetCache: new Map(),
    processedFiles: new Set()
  };

  return new HtmlProcessor(context);
}

/**
 * Processes HTML content with snippet injection and metadata
 */
export async function transformHtml(
  filePath: string, 
  content: string, 
  options: {
    mode: "development" | "production";
    sourceDir?: string;
    outputDir?: string;
  }
): Promise<string> {
  const processor = createHtmlProcessor(options);
  return await processor.processHtml(filePath, content);
}

/**
 * Determines if a file should be processed based on its path
 */
export function shouldProcessHtml(filePath: string): boolean {
  // Only process HTML files in the pages directory
  const pathSegments = filePath.split("/");
  return filePath.endsWith(".html") && pathSegments.includes("pages");
}