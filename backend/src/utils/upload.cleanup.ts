import fs from "fs/promises";
import path from "path";
import logger from "../config/logger.js";
import prisma from "../config/prisma.js";
import { Request, Response } from "express";
import { TEMP_DIR } from "../config/upload.js";

const STALE_UPLOAD_FILE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

type UploadCleanupState = {
  tempFiles: Set<string>;
  filesCleanedUp: boolean;
  reservationReleased: boolean;
  reservedBytes?: bigint;
  cleanupPromise?: Promise<void>;
};

const ensureUploadCleanupState = (res: Response): UploadCleanupState => {
  if (!res.locals.uploadCleanupState) {
    res.locals.uploadCleanupState = {
      tempFiles: new Set<string>(),
      filesCleanedUp: false,
      reservationReleased: Boolean(res.locals.reservationReleased)
    } as UploadCleanupState;
  }

  return res.locals.uploadCleanupState as UploadCleanupState;
};

export const getUploadedFiles = (req: Request, res: Response): Express.Multer.File[] => {
  const localsFiles = res.locals.allFiles as Express.Multer.File[] | undefined;
  if (localsFiles && localsFiles.length > 0) {
    return localsFiles;
  }
  if (req.allFiles && req.allFiles.length > 0) {
    return req.allFiles;
  }
  if (req.file) {
    return [req.file];
  }
  if (req.files) {
    if (Array.isArray(req.files)) {
      return req.files;
    }
    return Object.values(req.files).flat();
  }
  return [];
};

const resolveTempFilePath = (file: Express.Multer.File): string | null => {
  const tempDir = path.resolve(TEMP_DIR);
  const candidate =
    file.path ||
    (file.destination && file.filename ? path.join(file.destination, file.filename) : undefined) ||
    (file.filename ? path.join(tempDir, path.basename(file.filename)) : undefined);

  if (!candidate) {
    return null;
  }

  const resolved = path.resolve(candidate);
  const relative = path.relative(tempDir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    logger.error(`Invalid temp file path detected during cleanup: ${resolved}`);
    return null;
  }

  return resolved;
};

export const removeTempFiles = async (files: Express.Multer.File[]): Promise<void> => {
  const tempFiles = new Set<string>();

  for (const file of files) {
    const resolved = resolveTempFilePath(file);
    if (resolved) {
      tempFiles.add(resolved);
    }
  }

  if (tempFiles.size === 0) {
    return;
  }

  await Promise.all(
    Array.from(tempFiles).map(async filePath => {
      try {
        await fs.rm(filePath, { force: true });
      }
      catch (unlinkErr) {
        logger.warn(`Failed to cleanup temp file ${filePath}: ${unlinkErr}`);
      }
    })
  );
};

export const registerTempFiles = (res: Response, files: Express.Multer.File[]): void => {
  const state = ensureUploadCleanupState(res);

  for (const file of files) {
    const resolved = resolveTempFilePath(file);
    if (resolved) {
      state.tempFiles.add(resolved);
    }
  }
};

export const registerReservedBytes = (res: Response, reservedBytes: bigint): void => {
  const state = ensureUploadCleanupState(res);
  state.reservedBytes = reservedBytes;
};

/**
 * Cleanup temporary files from an upload
 */
export async function cleanupTempFiles(
  req: Request,
  res: Response,
  reason: string
): Promise<void> {
  const state = ensureUploadCleanupState(res);

  if (state.filesCleanedUp) {
    return;
  }

  if (state.tempFiles.size === 0) {
    const files = getUploadedFiles(req, res);
    registerTempFiles(res, files);
  }

  const tempFiles = Array.from(state.tempFiles);
  if (tempFiles.length === 0) {
    state.filesCleanedUp = true;
    res.locals.filesCleanedUp = true;
    return;
  }

  await Promise.all(
    tempFiles.map(async filePath => {
      try {
        await fs.rm(filePath, { force: true });
      }
      catch (unlinkErr) {
        logger.warn(`Failed to cleanup temp file ${filePath}: ${unlinkErr}`);
      }
    })
  );

  logger.info(`Cleaned up ${tempFiles.length} temp file(s) due to ${reason}`);
  state.filesCleanedUp = true;
  res.locals.filesCleanedUp = true;
}

/**
 * Rollback reserved storage quota from preflight check
 */
export async function rollbackStorageQuota(
  req: Request,
  res: Response,
  reason: string
): Promise<void> {
  const state = ensureUploadCleanupState(res);

  if (res.locals.reservationReleased) {
    state.reservationReleased = true;
  }

  if (state.reservationReleased) {
    return;
  }

  const reservedBytes =
    (res.locals.reservedBytes as bigint | undefined) ??
    state.reservedBytes;
  const classIdStr = req.session.classId;

  if (reservedBytes && classIdStr) {
    const classIdNum = parseInt(classIdStr, 10);
    try {
      await prisma.class.update({
        where: { classId: classIdNum },
        data: {
          storageUsedBytes: {
            decrement: reservedBytes
          }
        }
      });
      state.reservationReleased = true;
      res.locals.reservationReleased = true;
      logger.info(`Rolled back ${reservedBytes} bytes reservation for class ${classIdNum} due to ${reason}`);
    }
    catch (rollbackErr) {
      logger.warn(`Rollback of reserved storage failed (${reason}): ${rollbackErr}`);
    }
  }
}

/**
 * Perform full cleanup: delete temp files and rollback storage quota
 */
export async function performUploadCleanup(
  req: Request,
  res: Response,
  reason: string
): Promise<void> {
  const state = ensureUploadCleanupState(res);

  if (!state.cleanupPromise) {
    state.cleanupPromise = (async () => {
      await cleanupTempFiles(req, res, reason);
      await rollbackStorageQuota(req, res, reason);
    })();
  }

  await state.cleanupPromise;
}

const cleanupStaleFilesInDir = async (dirPath: string, maxAgeMs: number): Promise<number> => {
  let removedCount = 0;

  let entries: string[];
  try {
    entries = await fs.readdir(dirPath);
  }
  catch (error) {
    logger.warn(`Failed to read stale upload directory ${dirPath}: ${error}`);
    return removedCount;
  }

  const now = Date.now();

  await Promise.all(entries.map(async entry => {
    const fullPath = path.join(dirPath, entry);
    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isFile()) {
        return;
      }
      if (now - stats.mtimeMs > maxAgeMs) {
        await fs.rm(fullPath, { force: true });
        removedCount += 1;
      }
    }
    catch (error) {
      logger.warn(`Failed to cleanup stale upload file ${fullPath}: ${error}`);
    }
  }));

  return removedCount;
};

export const cleanupStaleUploadFiles = async (maxAgeMs = STALE_UPLOAD_FILE_MAX_AGE_MS): Promise<void> => {
  const tempRemoved = await cleanupStaleFilesInDir(TEMP_DIR, maxAgeMs);

  if (tempRemoved > 0) {
    logger.info(`Cleaned up ${tempRemoved} stale upload file(s)`);
  }
};
