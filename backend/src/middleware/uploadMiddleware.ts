import multer, { FileFilterCallback } from "multer";
import { 
  ALLOWED_MIMES, 
  ALLOWED_EXTENSIONS, 
  TEMP_DIR
} from "../config/upload";
import path from "path";
import { Request, Response, NextFunction } from "express";
import mime from "mime-types";
import { RequestError } from "../@types/requestError";
import { randomUUID } from "crypto";
import prisma from "../config/prisma";

// normalizes file requests into one consistent format
export const normalizeFiles = async (req: Request,
  res: Response,
  next: NextFunction): Promise<void> => {

  if (!req.file && !req.files) {
    const err: RequestError = {
      name: "Bad Request",
      status: 400,
      message: "No file was uploaded",
      expected: true
    };
    return next(err);
  }

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
  res.locals.allFiles = req.allFiles;
  next();
};

// preflight quota check with atomic reservation
export const preflightStorageQuotaCheck = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const contentLengthStr = req.headers["content-length"];
  if (!contentLengthStr) {
    const err: RequestError = {
      name: "Bad Request",
      status: 400,
      message: "Missing content-length header",
      expected: true
    };
    return next(err);
  }

  const totalUploadSize = BigInt(contentLengthStr);
  const session = req.session;
  const classIdNum = parseInt(session.classId!, 10);

  try {
    // Atomically check and reserve storage in a transaction
    await prisma.$transaction(async tx => {
      const classQuota = await tx.class.findUnique({
        where: { classId: classIdNum },
        select: {
          storageQuotaBytes: true,
          storageUsedBytes: true
        }
      });

      if (!classQuota) {
        const err: RequestError = {
          name: "Not Found",
          status: 404,
          message: "Class not found",
          expected: true
        };
        throw err;
      }

      // Check if upload would exceed quota
      if (classQuota.storageUsedBytes + totalUploadSize > classQuota.storageQuotaBytes) {
        const err: RequestError = {
          name: "Insufficient Storage",
          status: 507,
          message: "Class storage quota would be exceeded",
          expected: true
        };
        throw err;
      }

      // Reserve the storage immediately
      await tx.class.update({
        where: { classId: classIdNum },
        data: {
          storageUsedBytes: {
            increment: totalUploadSize
          }
        }
      });
    });

    // Store reserved amount in res.locals for service layer
    res.locals.reservedBytes = totalUploadSize;
    next();
  } 
  catch (error) {
    next(error);
  }
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
// Multer upload instance configured with storage, filter, and limits
//
export const secureUpload = multer({
  storage: tempStorage,
  fileFilter: secureFileFilter,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB limit
  }
});


export default {
  secureUpload,
  preflightStorageQuotaCheck,
  normalizeFiles
};