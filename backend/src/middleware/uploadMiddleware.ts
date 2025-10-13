import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs/promises";
import { Request, Response, NextFunction } from "express";
import mime from "mime-types";
import sharp from "sharp";
import { ExecException, execFile } from "child_process";
import { promisify } from "util";
import logger from "../utils/logger";
import { RequestError } from "../@types/requestError";
import { randomUUID } from "crypto";
import prisma from "../config/prisma";

const execFileAsync = promisify(execFile);

const ALLOWED_MIMES = ["application/pdf", "image/jpeg", "image/png"];
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

const TEMP_DIR = path.join(__dirname, "../../../data/temp");
const QUARANTINE_DIR = path.join(__dirname, "../../../data/quarantine");
const SANITIZED_DIR = path.join(__dirname, "../../../data/sanitized");
export const FINAL_UPLOADS_DIR = path.join(__dirname, "../../../data/uploads");

const CLAMSCAN_TIMEOUT = 30000;
const GHOSTSCRIPT_TIMEOUT = 60000;
const MAX_IMAGE_PIXELS = 30000000;

let gsCommand: string | null = null;
let clamavEnabled = false;


let fileTypeModulePromise: Promise<typeof import("file-type")> | null = null;
async function getFileTypeModule(): Promise<typeof import("file-type")> {
  fileTypeModulePromise ||= import("file-type");
  return fileTypeModulePromise;
}


const ensureDirExists = async (dirPath: string): Promise<void> => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  }
  catch (error) {
    logger.error(`Failed to create directory ${dirPath}`, error);
    throw error;
  }
};

//
// script called in server.ts at server startup 
// to avoid excessive which calls at every upload request and path checking
// 
export const initializeUploadServices = async (): Promise<void> => {

  await Promise.all([
    ensureDirExists(TEMP_DIR),
    ensureDirExists(QUARANTINE_DIR),
    ensureDirExists(SANITIZED_DIR),
    ensureDirExists(FINAL_UPLOADS_DIR)
  ]);

  try {
    await execFileAsync("which clamscan");
    clamavEnabled = true;
  }
  catch {
    logger.warn("ClamAV not found. Antivirus scanning is DISABLED. Server security degraded.");
  }

  try {
    await execFileAsync("which gs");
    gsCommand = "gs";
  }
  catch {
    try {
      await execFileAsync("which ghostscript");
      gsCommand = "ghostscript";
    }
    catch {
      logger.warn("Ghostscript not found. PDF sanitization is DISABLED. Server security degraded.");
    }
  }
};

// normalizes your request into one consistent format:
// always req.allFiles = [ ... ] (even for one file).
// Now every later middleware can just assume:
// for (const file of req.allFiles) { ... }
export const normalizeFiles = async (req: Request,
  res: Response,
  next: NextFunction): Promise<void> => {

  if (req.file) {
    req.allFiles = [req.file];
  } 
  else if (req.files) {
    // Multer array() or fields() could give different shapes
    if (Array.isArray(req.files)) {
      req.allFiles = req.files;
    } 
    else {
      // If fields() was used: { field1: [..], field2: [..] }
      req.allFiles = Object.values(req.files).flat();
    }
  } 
  else {
    req.allFiles = [];
  }
  next();
};

// preflight quotafast DB check to block when the class is already over its quota
export const preflightStorageQuotaCheck = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const approxFileSizeStr = req.headers["content-length"];
  if (!approxFileSizeStr) {
    const err: RequestError = {
      name: "Bad Request",
      status: 400,
      message: "Missing content-length header",
      expected: true
    };
    return next(err);
  }
  const approxFileSize: bigint = BigInt(approxFileSizeStr);
  const session = req.session;
  const classQuota = await prisma.class.findUnique({
    where: {
      classId: parseInt(session.classId!, 10)
    },
    select: {
      storageQuotaBytes: true,
      storageUsedBytes: true
    }
  });

  if (classQuota!.storageUsedBytes + approxFileSize > classQuota!.storageQuotaBytes) {
    const err: RequestError = {
      name: "Insufficient Storage",
      status: 507,
      message: "Class quota was exceeded",
      expected: true
    };
    return next(err);
  }
  next();
};

//
// Temp storage before file is scanned and sanitized
//
export const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = randomUUID();
    const detectedExt = mime.extension(file.mimetype) || path.extname(file.originalname).substring(1);
    cb(null, `${uniqueSuffix}.${detectedExt}`);
  }
});

//
// Filter for MIME type and extension based on client-provided info
//
export const secureFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
): void => {
  // Check extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    const err = new Error(`File extension ${ext} not allowed`) as RequestError;
    err.status = 400;
    return cb(err);
  }

  // Check client-provided MIME type
  if (!ALLOWED_MIMES.includes(file.mimetype)) {
    const err = new Error(`MIME type ${file.mimetype} not allowed`) as RequestError;
    err.status = 400;
    return cb(err);
  }

  // Check for obvious mismatches
  const expectedMime = mime.lookup(file.originalname);
  if (expectedMime && expectedMime !== file.mimetype) {
    const err = new Error("MIME type does not match file extension") as RequestError;
    err.status = 400;
    return cb(err);
  }

  cb(null, true);
};

//
// Middleware to verify actual file type using MIME sniffing (magic bytes)
//
export const verifyFileType = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.file) {
    const err: RequestError = {
      name: "Bad Request",
      status: 400,
      message: "No file was uploaded",
      expected: true
    };
    return next(err);
  }

  const filePath = req.file.path;
  try {
    // Dynamically import ESM module from CJS context
    const { fileTypeFromFile } = await getFileTypeModule();
    const detectedType = await fileTypeFromFile(filePath);

    // Verify detected MIME type is allowed
    if (!detectedType || !ALLOWED_MIMES.includes(detectedType.mime)) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: `Actual file type ${detectedType?.mime || "unknown"} not allowed`,
        expected: true
      };
      return next(err);
    }

    // Verify detected type matches what client claimed
    if (detectedType.mime !== req.file.mimetype) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: `File type mismatch: claimed ${req.file.mimetype}, actual ${detectedType.mime}`,
        expected: true
      };
      return next(err);
    }

    res.locals.verifiedMime = detectedType.mime;
    next();
  }
  catch (error) {
    logger.error("Error during file type verification:", error);
    // Delete the temporary file if it exists
    if (req.file.path) {
      await fs.unlink(req.file.path).catch(err => {
        if (err.code !== "ENOENT") {
          logger.error(`Error deleting temp file ${req.file?.path}`, err);
        }
      });
    }
    next(error);
  }
};

//
// Multer upload instance configured with storage, filter, and limits
//
export const secureUpload = multer({
  storage: tempStorage,
  fileFilter: secureFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});


/**
 * Scans a single file with ClamAV.
 */
const scanFileClamAV = async (filePath: string, originalName: string): Promise<void> => {
  try {
    await execFileAsync("clamscan", ["--no-summary", filePath], { timeout: CLAMSCAN_TIMEOUT });
    // Exit code 0 means no virus found.
  }
  catch (error) {
    const scanError = error as ExecException & { stdout?: string; stderr?: string };
    // ClamAV exit code 1 means a virus was found.
    if (scanError.code === 1 && scanError.stdout?.includes("FOUND")) {
      const quarantinePath = path.join(QUARANTINE_DIR, `${Date.now()}-${path.basename(originalName)}`);
      await fs.rename(filePath, quarantinePath).catch(err => {
        if (err.code !== "ENOENT") {
          logger.error(`Error moving file to quarantine ${filePath}`, err);
        }
      });
      logger.warn(`[VIRUS_DETECTED] File quarantined to ${quarantinePath}. Original name: ${originalName}`);

      const err: RequestError = {
        name: "Virus Detected",
        status: 400,
        message: "File rejected: malware detected",
        additionalInformation: "The uploaded file has been quarantined.",
        expected: false
      };
      throw err;
    }
    else {
      // Any other non-zero exit code is a ClamAV error.
      logger.error("[CLAMAV_SCAN_ERROR] ClamAV failed to scan the file.", scanError);
      throw new Error("Could not scan file for malware.");
    }
  }
};

/**
 * Middleware to perform antivirus scan using ClamAV.
 */
export const antivirusScan = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!clamavEnabled) {
    return next();
  }

  try {
    await scanFileClamAV(req.file.path, req.file.originalname);
    next();
  }
  catch (error) {
    // If an error occurs, delete the temp file
    if (req.file.path) {
      await fs.unlink(req.file.path).catch(err => {
        if (err.code !== "ENOENT") {
          logger.error(`Error deleting temp file ${req.file?.path}`, err);
        }
      });
    }
    next(error);
  }
};

/**
 * Middleware to sanitize images by re-encoding them with sharp.
 */
export const sanitizeImage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.file.mimetype.startsWith("image/")) {
    return next();
  }

  const tempFilePath = req.file.path;
  const sanitizedPath = path.join(SANITIZED_DIR, `sanitized-${path.basename(tempFilePath)}`);

  try {
    const sharpInstance = sharp(tempFilePath, {
      limitInputPixels: MAX_IMAGE_PIXELS
    }).rotate(); // Auto-rotate based on EXIF (then strip it), protection against decompression bombs

    if (req.file.mimetype === "image/png") {
      await sharpInstance.png({ compressionLevel: 9, effort: 8 }).toFile(sanitizedPath);
    }
    else {
      await sharpInstance.jpeg({ quality: 90 }).toFile(sanitizedPath);
    }

    // Replace the original temp file with the sanitized version
    await fs.unlink(tempFilePath);
    await fs.rename(sanitizedPath, tempFilePath);

    // Update the file size on the request object
    const stats = await fs.stat(tempFilePath);
    req.file.size = stats.size;

    next();
  }
  catch (error) {
    logger.error("[IMAGE_SANITIZATION_ERROR]", error);
    if (req.file.path) {
      await fs.unlink(req.file.path).catch(err => {
        if (err.code !== "ENOENT") logger.error(`Error deleting temp file ${req.file?.path}`, err);
      });
    }
    await fs.unlink(sanitizedPath).catch(err => {
      if (err.code !== "ENOENT") logger.error(`Error deleting sanitized file ${sanitizedPath}`, err);
    });

    const err: RequestError = {
      name: "Internal Server Error",
      status: 500,
      message: "Error processing image file.",
      expected: true
    };
    next(err);
  }
};

/**
 * Middleware to sanitize PDFs using Ghostscript to remove active content.
 */
export const sanitizePDF = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.file.mimetype !== "application/pdf" || !gsCommand) {
    return next();
  }

  const tempFilePath = req.file.path;
  const sanitizedPath = path.join(SANITIZED_DIR, `sanitized-${path.basename(tempFilePath)}`);

  try {

    const gsArgs = [
      "-dPDFA=1", // Convert to PDF/A-1
      "-dBATCH", // Exit after processing
      "-dPDFSETTINGS=/ebook", // final image resulution of 150 DPI
      "-dNOPAUSE", // Don't pause between pages
      "-dNOOUTERSAVE", // Security setting
      "-dSAFER", // Restrict file operations
      "-sDEVICE=pdfwrite", // Output device
      "-sColorConversionStrategy=UseDeviceIndependentColor",
      "-dPDFACompatibilityPolicy=1", // Silently convert non-compliant content
      `-sOutputFile=${sanitizedPath}`,
      tempFilePath
    ];

    await execFileAsync(gsCommand, gsArgs, { timeout: GHOSTSCRIPT_TIMEOUT });

    const stats = await fs.stat(sanitizedPath).catch(() => null);
    if (!stats || stats.size === 0) {
      throw new Error("Ghostscript failed to create a valid sanitized PDF.");
    }

    // Replace original with sanitized version
    await fs.unlink(tempFilePath);
    await fs.rename(sanitizedPath, tempFilePath);

    // Update the file size on the request object
    req.file.size = (await fs.stat(tempFilePath)).size;

    next();
  }
  catch (error) {
    logger.error("[PDF_SANITIZATION_ERROR]", error);
    if (req.file.path) {
      await fs.unlink(req.file.path).catch(err => {
        if (err.code !== "ENOENT") logger.error(`Error deleting temp file ${req.file?.path}`, err);
      });
    }
    await fs.unlink(sanitizedPath).catch(err => {
      if (err.code !== "ENOENT") logger.error(`Error deleting sanitized file ${sanitizedPath}`, err);
    });

    const err: RequestError = {
      name: "Internal Server Error",
      status: 500,
      message: "Error processing PDF file.",
      expected: true
    };
    next(err);
  }
};

export default {
  secureUpload,
  preflightStorageQuotaCheck,
  verifyFileType,
  antivirusScan,
  sanitizeImage,
  sanitizePDF
};