import { dequeueJob, QUEUE_KEYS } from "../config/redis";
import logger from "./logger";
import prisma from "../config/prisma";
import fs from "fs/promises";
import path from "path";
import { 
  FINAL_UPLOADS_DIR, 
  QUARANTINE_DIR, 
  SANITIZED_DIR, 
  CLAMSCAN_TIMEOUT, 
  GHOSTSCRIPT_TIMEOUT, 
  MAX_IMAGE_PIXELS, 
  TEMP_DIR 
} from "../config/upload";
import { execFile, ExecException } from "child_process";
import { promisify } from "util";
import sharp from "sharp";
import mime from "mime-types";
import { randomUUID } from "crypto";

const execFileAsync = promisify(execFile);

const ensureDirExists = async (dirPath: string): Promise<void> => {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  }
  catch (error) {
    logger.error(`Failed to create directory ${dirPath}`, error);
    throw error;
  }
};

let gsCommand: string | null = null;
let clamavEnabled = false;
let fileTypeModulePromise: Promise<typeof import("file-type")> | null = null;

async function getFileTypeModule(): Promise<typeof import("file-type")> {
  fileTypeModulePromise ||= import("file-type");
  return fileTypeModulePromise;
}

type FileProcessingJob = {
  uploadId: number;
  classId: number;
  tempFiles: Array<{
    path: string;
    originalName: string;
    mimetype: string;
    size: number;
  }>;
};

//
// script called in server.ts at server startup 
// to avoid excessive which calls at every upload request and path checking
// 
export const initializeUploadWorkerServices = async (): Promise<void> => {

  await Promise.all([
    ensureDirExists(TEMP_DIR),
    ensureDirExists(QUARANTINE_DIR),
    ensureDirExists(SANITIZED_DIR),
    ensureDirExists(FINAL_UPLOADS_DIR)
  ]);

  try {
    await execFileAsync("which", ["clamscan"]);
    clamavEnabled = true;
    logger.info("ClamAV enabled for worker");
  } 
  catch {
    logger.warn("ClamAV not found in worker. Antivirus scanning is DISABLED. Server security degraded.");
  }

  try {
    await execFileAsync("which", ["gs"]);
    gsCommand = "gs";
    logger.info("Ghostscript enabled for worker");
  } 
  catch {
    logger.warn("Ghostscript not found in worker. PDF sanitization is DISABLED. Server security degraded.");
  }
};

const scanFileClamAV = async (filePath: string, originalName: string): Promise<void> => {
  if (!clamavEnabled) return;

  try {
    await execFileAsync("clamscan", ["--no-summary", filePath], { timeout: CLAMSCAN_TIMEOUT });
  } 
  catch (error) {
    const scanError = error as ExecException & { stdout?: string; stderr?: string };
    if (scanError.code === 1 && scanError.stdout?.includes("FOUND")) {
      const quarantinePath = path.join(QUARANTINE_DIR, `${Date.now()}-${path.basename(originalName)}`);
      await fs.rename(filePath, quarantinePath).catch(() => {});
      logger.warn(`File quarantined: ${quarantinePath}`);
      throw new Error("virus_detected");
    } 
    else {
      logger.error("ClamAV scan failed", scanError);
      throw new Error("scan_failed");
    }
  }
};

const verifyFileType = async (filePath: string, claimedMime: string): Promise<void> => {
  const { fileTypeFromFile } = await getFileTypeModule();
  const detectedType = await fileTypeFromFile(filePath);

  if (!detectedType || detectedType.mime !== claimedMime) {
    throw new Error("mime_mismatch");
  }
};

const sanitizeImage = async (filePath: string, mimetype: string): Promise<number> => {
  const sanitizedPath = path.join(SANITIZED_DIR, `sanitized-${path.basename(filePath)}`);

  try {
    const sharpInstance = sharp(filePath, { limitInputPixels: MAX_IMAGE_PIXELS }).rotate();

    if (mimetype === "image/png") {
      await sharpInstance.png({ compressionLevel: 9, effort: 8 }).toFile(sanitizedPath);
    } 
    else {
      await sharpInstance.jpeg({ quality: 90 }).toFile(sanitizedPath);
    }

    await fs.unlink(filePath);
    await fs.rename(sanitizedPath, filePath);

    const stats = await fs.stat(filePath);
    return stats.size;
  } 
  catch {
    await fs.unlink(sanitizedPath).catch(() => {});
    throw new Error("image_sanitization_failed");
  }
};

const sanitizePDF = async (filePath: string): Promise<number> => {
  if (!gsCommand) return (await fs.stat(filePath)).size;

  const sanitizedPath = path.join(SANITIZED_DIR, `sanitized-${path.basename(filePath)}`);

  try {
    const gsArgs = [
      "-dPDFA=1",
      "-dBATCH",
      "-dPDFSETTINGS=/ebook",
      "-dNOPAUSE",
      "-dNOOUTERSAVE",
      "-dSAFER",
      "-sDEVICE=pdfwrite",
      "-sColorConversionStrategy=UseDeviceIndependentColor",
      "-dPDFACompatibilityPolicy=1",
      `-sOutputFile=${sanitizedPath}`,
      filePath
    ];

    await execFileAsync(gsCommand, gsArgs, { timeout: GHOSTSCRIPT_TIMEOUT });

    const stats = await fs.stat(sanitizedPath);
    if (!stats || stats.size === 0) {
      throw new Error("Ghostscript produced empty file");
    }

    await fs.unlink(filePath);
    await fs.rename(sanitizedPath, filePath);

    return stats.size;
  } 
  catch {
    await fs.unlink(sanitizedPath).catch(() => {});
    throw new Error("pdf_sanitization_failed");
  }
};

const processFile = async (file: FileProcessingJob["tempFiles"][0], classId: number): Promise<{ storedFileName: string; finalSize: number }> => {
  await verifyFileType(file.path, file.mimetype);
  await scanFileClamAV(file.path, file.originalName);

  // Sanitize based on type
  let finalSize = file.size;
  if (file.mimetype.startsWith("image/")) {
    finalSize = await sanitizeImage(file.path, file.mimetype);
  } 
  else if (file.mimetype === "application/pdf") {
    finalSize = await sanitizePDF(file.path);
  }

  // Move to final destination
  const finalDirectory = path.join(FINAL_UPLOADS_DIR, classId.toString());
  await fs.mkdir(finalDirectory, { recursive: true });

  const ext = mime.extension(file.mimetype);
  if (!ext) {
    throw new Error("unsupported_mime_type");
  }
  const storedFileName = `${randomUUID()}.${ext}`;
  const finalPath = path.join(finalDirectory, storedFileName);

  await fs.rename(file.path, finalPath);

  return { storedFileName, finalSize };
};

const processJob = async (job: FileProcessingJob): Promise<void> => {
  const { uploadId, classId, tempFiles } = job;

  try {
    // Update status to processing
    const upload = await prisma.upload.findUnique({
      where: { uploadId },
      select: { reservedBytes: true }
    });

    if (!upload) {
      throw new Error("Upload record not found");
    }

    await prisma.upload.update({
      where: { uploadId },
      data: { status: "processing" }
    });

    const processedFiles: Array<{ storedFileName: string; originalName: string; mimeType: string; size: number }> = [];
    let totalBytes = 0n;

    // Process each file
    for (const file of tempFiles) {
      const { storedFileName, finalSize } = await processFile(file, classId);
      processedFiles.push({
        storedFileName,
        originalName: file.originalName,
        mimeType: file.mimetype,
        size: finalSize
      });
      totalBytes += BigInt(finalSize);
    }

    // Store metadata and adjust storage atomically
    await prisma.$transaction(async tx => {
      for (const file of processedFiles) {
        await tx.fileMetadata.create({
          data: {
            uploadId,
            storedFileName: file.storedFileName,
            mimeType: file.mimeType,
            size: file.size,
            createdAt: BigInt(Date.now())
          }
        });
      }

      // Calculate storage adjustment (actual - reserved)
      const storageAdjustment = totalBytes - upload.reservedBytes;

      // Adjust class storage (can be positive or negative)
      await tx.class.update({
        where: { classId },
        data: { 
          storageUsedBytes: storageAdjustment >= 0n
            ? { increment: storageAdjustment }
            : { decrement: -storageAdjustment }
        }
      });

      // Mark upload as completed and clear reservation
      await tx.upload.update({
        where: { uploadId },
        data: { 
          status: "completed",
          reservedBytes: 0n
        }
      });
    });

    logger.info(`Successfully processed upload ${uploadId} with ${processedFiles.length} file(s)`);
  } 
  catch (error) {
    logger.error(`Failed to process upload ${uploadId}:`, error);

    // Clean up all temp files
    await Promise.all(tempFiles.map(f => fs.unlink(f.path).catch(() => {})));

    // Mark upload as failed and release reserved storage
    const errorReason = error instanceof Error ? error.message : "unknown_error";
    
    await prisma.$transaction(async tx => {
      const upload = await tx.upload.findUnique({
        where: { uploadId },
        select: { reservedBytes: true }
      });

      if (upload && upload.reservedBytes > 0n) {
        // Release reserved storage
        await tx.class.update({
          where: { classId },
          data: { storageUsedBytes: { decrement: upload.reservedBytes } }
        });
      }

      await tx.upload.update({
        where: { uploadId },
        data: {
          status: "failed",
          errorReason,
          reservedBytes: 0n
        }
      });
    });
  }
};

let isRunning = false;

export const startUploadWorker = async (): Promise<void> => {
  if (isRunning) {
    logger.warn("Worker already running");
    return;
  }

  isRunning = true;
  logger.info("File processing worker started");

  while (isRunning) {
    try {
      const job = await dequeueJob(QUEUE_KEYS.FILE_PROCESSING) as FileProcessingJob | null;

      if (job) {
        await processJob(job);
      } 
      else {
        // No jobs, wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } 
    catch (error) {
      logger.error("Worker error:", error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

export const stopUploadWorker = (): void => {
  isRunning = false;
  logger.info("File processing worker stopped");
};
