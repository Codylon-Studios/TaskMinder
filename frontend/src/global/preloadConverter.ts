/**
 * Utility to convert preload links with class="preload-style" to actual stylesheets
 * This prevents browser warnings about unused preloads and ensures styles are applied
 */

export function convertPreloadsToStylesheets(): void {
  // Find all preload links with the preload-style class
  const preloadLinks = document.querySelectorAll('link[rel="preload"][class="preload-style"]');
  
  preloadLinks.forEach(preloadLink => {
    const link = preloadLink as HTMLLinkElement;
    
    // Create a new stylesheet link element
    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = link.href;
    stylesheet.type = "text/css";
    
    // Copy any other relevant attributes
    if (link.media) {
      stylesheet.media = link.media;
    }
    if (link.crossOrigin) {
      stylesheet.crossOrigin = link.crossOrigin;
    }
    
    // Insert the stylesheet after the preload link
    link.parentNode?.insertBefore(stylesheet, link.nextSibling);
    
    // Remove the preload link to prevent browser warnings
    link.remove();
  });
}

/**
 * Initialize preload conversion on DOMContentLoaded
 * This ensures the conversion happens after all HTML is parsed
 */
export function initPreloadConverter(): void {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", convertPreloadsToStylesheets);
  } 
  else {
    // DOM is already loaded
    convertPreloadsToStylesheets();
  }
}

// Auto-initialize if this script is loaded directly
if (typeof window !== "undefined") {
  initPreloadConverter();
}