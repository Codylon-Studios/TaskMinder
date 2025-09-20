import { resolve } from "path";
import { readFile, writeFile, ensureDir, exists } from "fs-extra";
import { HtmlProcessor, BuildContext } from "./HtmlProcessor";
import { glob } from "glob";

export interface BuildHooksOptions {
  sourceDir: string
  outputDir: string
  mode: "development" | "production"
}

export class BuildHooks {
  private options: BuildHooksOptions;
  private processor: HtmlProcessor;

  constructor(options: BuildHooksOptions) {
    this.options = options;
    
    const context: BuildContext = {
      mode: options.mode,
      sourceDir: options.sourceDir,
      outputDir: options.outputDir,
      snippetCache: new Map(),
      processedFiles: new Set()
    };
    
    this.processor = new HtmlProcessor(context);
  }

  async processAllHtmlFiles(): Promise<void> {
    console.log("Processing HTML files for build...");
    
    try {
      // Find all HTML files in pages directory
      const pagesDir = resolve(this.options.sourceDir, "pages");
      const htmlFiles = await glob(resolve(pagesDir, "**/*.html"));
      
      for (const htmlFile of htmlFiles) {
        await this.processHtmlFile(htmlFile);
      }
      
      console.log(`Processed ${htmlFiles.length} HTML files`);
    } 
    catch (error) {
      console.error("Error processing HTML files:", error);
      throw error;
    }
  }

  private async processHtmlFile(htmlFilePath: string): Promise<void> {
    try {
      const content = await readFile(htmlFilePath, "utf8");
      const processedHtml = await this.processor.processHtml(htmlFilePath, content);
      
      // Determine output path
      const relativePath = htmlFilePath.replace(this.options.sourceDir, "");
      const outputPath = resolve(this.options.outputDir, relativePath.slice(1)); // Remove leading slash
      
      // Ensure output directory exists
      await ensureDir(resolve(outputPath, ".."));
      
      // Write processed HTML
      await writeFile(outputPath, processedHtml, "utf8");
      
      console.log(`Processed: ${relativePath}`);
    } 
    catch (error) {
      console.error(`Error processing ${htmlFilePath}:`, error);
      throw error;
    }
  }

  async copyVendorAssets(): Promise<void> {
    console.log("Copying vendor assets...");
    
    try {
      // Copy vendor directory to output
      const vendorSrc = resolve(this.options.sourceDir, "vendor");
      const vendorDest = resolve(this.options.outputDir, "vendor");
      
      const vendorFiles = await glob(resolve(vendorSrc, "**/*"), { nodir: true });
      
      for (const file of vendorFiles) {
        const relativePath = file.replace(vendorSrc, "");
        const destPath = resolve(vendorDest, relativePath.slice(1));
        
        await ensureDir(resolve(destPath, ".."));
        
        const content = await readFile(file);
        await writeFile(destPath, content);
      }
      
      console.log(`Copied ${vendorFiles.length} vendor files`);
    }
    catch (error) {
      console.error("Error copying vendor assets:", error);
      // Don't throw - vendor assets are optional
    }
  }

  async copyStaticAssets(): Promise<void> {
    console.log("Copying static assets...");
    
    try {
      // Copy static directory to output
      const staticSrc = resolve(this.options.sourceDir, "static");
      const staticDest = resolve(this.options.outputDir, "static");
      
      if (await exists(staticSrc)) {
        const staticFiles = await glob(resolve(staticSrc, "**/*"), { nodir: true });
        
        for (const file of staticFiles) {
          const relativePath = file.replace(staticSrc, "");
          const destPath = resolve(staticDest, relativePath.slice(1));
          
          await ensureDir(resolve(destPath, ".."));
          
          const content = await readFile(file);
          await writeFile(destPath, content);
        }
        
        console.log(`Copied ${staticFiles.length} static files`);
      }
    }
    catch (error) {
      console.error("Error copying static assets:", error);
      // Don't throw - static assets might not exist
    }
  }

  async copyAssets(): Promise<void> {
    console.log("Copying assets...");
    
    try {
      // Copy assets directory to output (for files not processed by Vite)
      const assetsSrc = resolve(this.options.sourceDir, "assets");
      const assetsDest = resolve(this.options.outputDir, "assets");
      
      if (await exists(assetsSrc)) {
        const assetFiles = await glob(resolve(assetsSrc, "**/*"), { nodir: true });
        
        for (const file of assetFiles) {
          const relativePath = file.replace(assetsSrc, "");
          const destPath = resolve(assetsDest, relativePath.slice(1));
          
          // Skip files that Vite has already processed (they will have hashed names)
          const fileName = relativePath.slice(1);
          const existingHashedFiles = await glob(
            resolve(assetsDest, `${fileName.replace(/\.[^.]+$/, "")}-*${fileName.match(/\.[^.]+$/)?.[0] || ""}`)
          );
          
          if (existingHashedFiles.length === 0) {
            await ensureDir(resolve(destPath, ".."));
            
            const content = await readFile(file);
            await writeFile(destPath, content);
          }
        }
        
        console.log("Copied additional asset files");
      }
    }
    catch (error) {
      console.error("Error copying assets:", error);
      // Don't throw - assets might not exist
    }
  }

  async updateManifestAssetReferences(): Promise<void> {
    console.log("Updating manifest asset references...");
    
    try {
      const manifestPath = resolve(this.options.outputDir, "static", "manifest.json");
      
      if (await exists(manifestPath)) {
        const manifestContent = await readFile(manifestPath, "utf8");
        const manifest = JSON.parse(manifestContent);
        
        // Update app-icon.png reference to the hashed version
        const assetsDir = resolve(this.options.outputDir, "assets");
        const appIconFiles = await glob(resolve(assetsDir, "app-icon-*.png"));
        
        if (appIconFiles.length > 0) {
          const hashedIconFile = appIconFiles[0].split("/").pop();
          
          // Update all icon references
          if (manifest.icons && Array.isArray(manifest.icons)) {
            manifest.icons = manifest.icons.map((icon: { src: string; sizes?: string; type?: string }) => {
              if (icon.src === "/assets/app-icon.png") {
                return { ...icon, src: `/assets/${hashedIconFile}` };
              }
              return icon;
            });
          }
          
          // Write updated manifest
          await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
          console.log("Updated manifest with hashed asset references");
        }
      }
    }
    catch (error) {
      console.error("Error updating manifest asset references:", error);
      // Don't throw - this is not critical
    }
  }


}