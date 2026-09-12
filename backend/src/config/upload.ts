import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// allowed mimes grouped by file extension
export const EXPECTED_MIMES_BY_EXTENSION: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".txt": ["text/plain"],
  ".md": ["text/markdown", "text/plain"],
  ".csv": ["text/csv"],
  ".mp3": ["audio/mpeg", "audio/mp3"],
  ".mp4": ["video/mp4"]
};

export const MIME_CANONICAL_ALIASES: Record<string, string> = {
  "audio/mp3": "audio/mpeg"
};

// allowed mimes and file types (extensions)
export const ALLOWED_EXTENSIONS = Object.keys(EXPECTED_MIMES_BY_EXTENSION);
export const ALLOWED_MIMES = [...new Set(Object.values(EXPECTED_MIMES_BY_EXTENSION).flat())];

// upload limits
export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB // max file size of upload (each)
// that's roughly 2.43 MB storage per class for 5000 upload entries
export const MAX_FILES_PER_CLASS = 5000; // Maximum files per class
export const MAX_FILES_PER_UPLOAD = 20;

// directories for file storage
export const TEMP_DIR = path.join(__dirname, "../../../data/temp");
export const QUARANTINE_DIR = path.join(__dirname, "../../../data/quarantine");
export const SANITIZED_DIR = path.join(__dirname, "../../../data/sanitized");
export const FINAL_UPLOADS_DIR = path.join(__dirname, "../../../data/uploads");

// timeouts for services
export const CLAMSCAN_TIMEOUT = 30000;
export const GHOSTSCRIPT_TIMEOUT = 60000;
export const MAX_IMAGE_PIXELS = 30000000;

// types for file uploads
export enum FileTypes {
  INFO_SHEET = "INFO_SHEET",
  LESSON_NOTE = "LESSON_NOTE",
  WORKSHEET = "WORKSHEET",
  IMAGE = "IMAGE",
  FILE = "FILE",
  TEXT = "TEXT"
}