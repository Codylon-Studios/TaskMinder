import fs from "fs/promises";
import path from "path";
import logger from "../config/logger";
import prisma from "../config/prisma";
import { Request, Response } from "express";
import { TEMP_DIR } from "../config/upload";

/**
 * Cleanup temporary files from an upload
 */
export async function cleanupTempFiles(
  req: Request,
  res: Response,
  reason: string
): Promise<void> {
  if (res.locals.filesCleanedUp) {
    return;
  }

  if (req.allFiles && req.allFiles.length > 0) {
    await Promise.all(
      req.allFiles.map(file => {
        // Always resolve within the temp directory to avoid path traversal
        const tempDir = path.resolve(TEMP_DIR);
        const fileName = path.basename(file.filename ?? path.basename(file.path ?? ""));
        const safePath = path.resolve(tempDir, fileName);
        const relativeToTemp = path.relative(tempDir, safePath);

        if (!fileName || relativeToTemp.startsWith("..") || path.isAbsolute(relativeToTemp)) {
          logger.error(`Path traversal attempt detected during cleanup: ${file.path}`);
          return Promise.resolve();
        }

        return fs.unlink(safePath).catch(unlinkErr => {
          logger.warn(`Failed to cleanup temp file ${safePath}: ${unlinkErr}`);
        });
      })
    );
    logger.info(`Cleaned up ${req.allFiles.length} temp file(s) due to ${reason}`);
    res.locals.filesCleanedUp = true;
  }
}

/**
 * Rollback reserved storage quota from preflight check
 */
export async function rollbackStorageQuota(
  req: Request,
  res: Response,
  reason: string
): Promise<void> {
  if (res.locals.reservationReleased) {
    return;
  }

  const reservedBytes: bigint | undefined = res.locals.reservedBytes as bigint | undefined;
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
  await cleanupTempFiles(req, res, reason);
  await rollbackStorageQuota(req, res, reason);
}
