import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// allowed mimes and file types (extensions)
export const ALLOWED_MIMES = ["application/pdf", "image/jpeg", "image/png", "text/plain"];
export const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".txt"];

// upload limits
export const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
// that's roughly 2.43 MB storage per class for 5000 upload entries
export const MAX_FILE_COUNT = 5000; // Maximum files per class
export const MAX_FILES_COUNT = 20;

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