import { Session, SessionData } from "express-session";
import path from "path";
import { FINAL_UPLOADS_DIR } from "../config/upload";
import fs from "fs/promises";
import { ReadStream, createReadStream } from "fs";
import prisma from "../config/prisma";
import type { Prisma } from "@prisma/client";
import logger from "../config/logger";
import { RequestError } from "../@types/requestError";
import {
  deleteUploadTypeBody,
  getUploadFileType,
  editUploadTypeBody,
  uploadFileTypeBody,
  addUploadRequestTypeBody,
  deleteUploadRequestTypeBody
} from "../schemas/upload.schema";
import { queueJob, QUEUE_KEYS, generateCacheKey, CACHE_KEY_PREFIXES, redisClient } from "../config/redis";
import { invalidateCache, BigIntreplacer, isValidTeamId, isValidUploadInput, updateCacheData } from "../utils/validate.functions";
import socketIO, { SOCKET_EVENTS } from "../config/socket";


type GetUploadFileInput = {
  fileIdParam: number;
  action: getUploadFileType["query"]["action"];
  classId: string;
};

type GetUploadFileResult = {
  stream: ReadStream;
  headers: {
    "Content-Type": string;
    "Content-Disposition": string;
    "Cache-Control": string;
  };
};

// Helper function to map upload data
const mapUploadData = (uploads: Awaited<ReturnType<typeof prisma.upload.findMany<{
  include: {
    Account: { select: { username: true } };
    Files: true;
  };
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
}>>>) => {
  return uploads.map(upload => ({
    uploadId: upload.uploadId,
    uploadName: upload.uploadName,
    uploadDescription: upload.uploadDescription,
    uploadType: upload.uploadType,
    teamId: upload.teamId,
    status: upload.status,
    errorReason: upload.errorReason,
    accountName: upload.Account?.username ?? null,
    filesCount: upload.Files.length,
    createdAt: upload.createdAt,
    files: upload.Files.map(f => ({
      fileMetaDataId: f.fileMetaDataId,
      mimeType: f.mimeType,
      size: f.size,
      createdAt: f.createdAt
    }))
  }));
};

const uploadService = {
  async queueFileUpload(
    files: Express.Multer.File[],
    session: Session & Partial<SessionData>,
    body: uploadFileTypeBody,
    reservedBytes: bigint
  ) {
    const { uploadName, uploadDescription, uploadType, teamId: teamIdStr } = body;
    const teamId = Number.parseInt(teamIdStr, 10);

    await isValidTeamId(teamId, session);
    await isValidUploadInput(uploadName, uploadDescription, uploadType);

    const classIdNum = Number.parseInt(session.classId!, 10);
    const accountId = session.account?.accountId ?? null;

    const upload = await prisma.upload.create({
      data: {
        uploadName,
        uploadDescription,
        uploadType,
        status: "queued",
        teamId,
        classId: classIdNum,
        accountId,
        reservedBytes,
        createdAt: Date.now()
      }
    });

    const jobData = {
      uploadId: upload.uploadId,
      classId: classIdNum,
      tempFiles: files.map(f => ({
        path: f.path,
        originalName: f.originalname,
        mimetype: f.mimetype,
        size: f.size
      }))
    };

    await queueJob(QUEUE_KEYS.FILE_PROCESSING, jobData);

    // Invalidate cache after queueing new upload
    await invalidateCache("UPLOADMETADATA", session.classId!);

    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.UPLOADS);

    logger.info(`Queued upload ${upload.uploadId} with ${files.length} file(s)`);
  },

  async getUploadMetadata(isGetAllData: boolean, session: Session & Partial<SessionData>) {
    const classId = parseInt(session.classId!, 10);

    const classInformation = await prisma.class.findUnique({
      where: { classId },
      select: { storageUsedBytes: true, storageQuotaBytes: true }
    });

    const totalUploads = await prisma.upload.count({ where: { classId } });

    if (totalUploads === 0) {
      return {
        totalUploads: 0,
        uploads: [],
        hasMore: false,
        totalStorage: classInformation!.storageQuotaBytes.toString(),
        usedStorage: classInformation!.storageUsedBytes.toString()
      };
    }

    const include = {
      Account: { select: { username: true } },
      Files: true
    } as const;

    const orderBy: Prisma.UploadOrderByWithRelationInput[] = [
      { createdAt: "desc" },
      { uploadName: "asc" },
      { uploadId: "desc" }
    ];

    let uploadList;
    if (isGetAllData) {
      const uploads = await prisma.upload.findMany({
        where: { classId },
        include,
        orderBy
      });

      uploadList = mapUploadData(uploads);
    }
    else {
      // get cache data only if < 50 metadata is asked, at getAll, always get from db
      const getUploadMetadataCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.UPLOADMETADATA, session.classId!);

      const cachedUploadMetadataData = await redisClient.get(getUploadMetadataCacheKey);
      if (cachedUploadMetadataData) {
        try {
          uploadList = JSON.parse(cachedUploadMetadataData);
        }
        catch (error) {
          logger.error(`Error parsing Redis data: ${error}`);
        }
      }

      if (!uploadList) {
        const uploads = await prisma.upload.findMany({
          where: { classId },
          include,
          orderBy,
          take: 50
        });
        uploadList = mapUploadData(uploads);

        try {
          await updateCacheData(uploadList, getUploadMetadataCacheKey);
        }
        catch (err) {
          logger.error(`Error updating Redis data: ${err}`);
        }
      }
    }

    const hasMore = !isGetAllData && totalUploads > 50;

    const res = {
      totalUploads,
      uploads: uploadList,
      hasMore,
      totalStorage: classInformation!.storageQuotaBytes,
      usedStorage: classInformation!.storageUsedBytes
    };
    const stringified = JSON.stringify(res, BigIntreplacer);
    return JSON.parse(stringified);
  },

  async getUploadFile({ fileIdParam, action, classId }: GetUploadFileInput): Promise<GetUploadFileResult> {
    const fileData = await prisma.fileMetadata.findUnique({
      where: { fileMetaDataId: fileIdParam },
      include: {
        Upload: {
          select: {
            classId: true,
            uploadName: true,
            Files: {
              select: { fileMetaDataId: true },
              orderBy: { createdAt: "asc" }
            }
          }
        }
      }
    });

    if (!fileData || fileData.Upload.classId !== parseInt(classId, 10)) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "File not found or access denied.",
        expected: true
      };
      throw err;
    }

    const disposition = action === "download" ? "attachment" : "inline";
    
    // Get file numbering information
    const totalFiles = fileData.Upload.Files.length;
    const fileIndex = fileData.Upload.Files.findIndex(f => f.fileMetaDataId === fileIdParam);
    const fileNumber = fileIndex + 1;
    
    // Extract file extension from stored filename
    const fileExtension = path.extname(fileData.storedFileName);
    
    // Build filename with numbering if multiple files
    let filename = fileData.Upload.uploadName;
    if (totalFiles > 1) {
      filename += ` (${fileNumber} von ${totalFiles})`;
    }
    filename += fileExtension;

    const safeOriginalName = filename
      .replace(/[\r\n]/g, "") // Remove newlines that could enable header injection
      .replace(/\\/g, "\\\\") // Escape backslashes
      .replace(/"/g, '\\"');  // Escape quotes
      
    const headers = {
      "Content-Type": fileData.mimeType,
      "Content-Disposition": `${disposition}; filename="${safeOriginalName}"`,
      "Cache-Control": "private, no-store"
    };

    const finalFilePath = path.join(
      FINAL_UPLOADS_DIR,
      fileData.Upload.classId.toString(),
      fileData.storedFileName
    );

    try {
      await fs.access(finalFilePath, fs.constants.R_OK);
    }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        logger.error(`File not found on disk: ${finalFilePath}`);
        const err: RequestError = {
          name: "Not Found",
          status: 404,
          message: "File not found on server.",
          expected: true
        };
        throw err;
      }
      throw e;
    }

    const stream = createReadStream(finalFilePath);
    return { stream, headers };
  },

  async editUpload(
    body: editUploadTypeBody,
    session: Session & Partial<SessionData>,
    files: Express.Multer.File[]
  ) {
    const { uploadId, uploadName, uploadDescription, uploadType, teamId, changeFiles } = body;
    const classIdNum = parseInt(session.classId!, 10);
    const tempFiles = Array.isArray(files) ? files : [];

    const cleanupTempFiles = async (): Promise<void> => {
      await Promise.all(tempFiles.map(file => fs.unlink(file.path).catch(() => { })));
    };

    await isValidTeamId(teamId, session);
    await isValidUploadInput(uploadName, uploadDescription, uploadType);

    const uploadData = await prisma.upload.findUnique({
      where: { uploadId },
      include: { Files: true }
    });

    if (!uploadData || uploadData.classId !== classIdNum) {
      await cleanupTempFiles();
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Upload not found.",
        expected: true
      };
      throw err;
    }

    const hasFiles = tempFiles.length > 0;

    if (!changeFiles && hasFiles) {
      await cleanupTempFiles();
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Files cannot be uploaded when changeFiles is false.",
        expected: true
      };
      throw err;
    }

    if (!changeFiles) {
      await prisma.upload.update({
        where: { uploadId: uploadId, classId: classIdNum },
        data: { uploadName, uploadDescription, uploadType, teamId }
      });

      await invalidateCache("UPLOADMETADATA", session.classId!);

      const io = socketIO.getIO();
      io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.UPLOADS);
      return;
    }

    if (!hasFiles) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Files are required when changeFiles is true.",
        expected: true
      };
      throw err;
    }

    const oldFilesSize = uploadData.Files.reduce((sum, file) => sum + BigInt(file.size), 0n);
    const newFilesSize = tempFiles.reduce((sum, file) => sum + BigInt(file.size), 0n);

    try {
      await prisma.$transaction(async tx => {
        const classData = await tx.class.findUnique({
          where: { classId: classIdNum },
          select: { storageQuotaBytes: true, storageUsedBytes: true }
        });

        if (!classData) {
          const err: RequestError = {
            name: "Not Found",
            status: 404,
            message: "Class not found.",
            expected: true
          };
          throw err;
        }

        const projectedUsage = classData.storageUsedBytes - oldFilesSize + newFilesSize;
        if (projectedUsage > classData.storageQuotaBytes) {
          const err: RequestError = {
            name: "Insufficient Storage",
            status: 507,
            message: "Class storage quota would be exceeded",
            expected: true
          };
          throw err;
        }

        await tx.fileMetadata.deleteMany({ where: { uploadId } });

        const storageDelta = newFilesSize - oldFilesSize;
        if (storageDelta !== 0n) {
          await tx.class.update({
            where: { classId: classIdNum },
            data: storageDelta > 0n
              ? { storageUsedBytes: { increment: storageDelta } }
              : { storageUsedBytes: { decrement: -storageDelta } }
          });
        }

        await tx.upload.update({
          where: { uploadId },
          data: {
            uploadName,
            uploadDescription,
            uploadType,
            teamId,
            status: "queued",
            errorReason: null,
            reservedBytes: newFilesSize
          }
        });
      });

      const classDir = path.join(FINAL_UPLOADS_DIR, classIdNum.toString());
      await Promise.all(uploadData.Files.map(file => {
        const filePath = path.join(classDir, file.storedFileName);
        return fs.unlink(filePath).catch(() => { });
      }));

      const jobData = {
        uploadId,
        classId: classIdNum,
        tempFiles: tempFiles.map(file => ({
          path: file.path,
          originalName: file.originalname,
          mimetype: file.mimetype,
          size: file.size
        }))
      };

      await queueJob(QUEUE_KEYS.FILE_PROCESSING, jobData);

      await invalidateCache("UPLOADMETADATA", session.classId!);

      const io = socketIO.getIO();
      io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.UPLOADS);
    }
    catch (error) {
      await cleanupTempFiles();
      throw error;
    }
  },

  async deleteUpload(
    body: deleteUploadTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { uploadId } = body;
    const classIdNum = parseInt(session.classId!, 10);

    const uploadData = await prisma.upload.findUnique({
      where: { uploadId },
      include: { Files: true }
    });

    if (!uploadData || uploadData.classId !== classIdNum) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Upload not found.",
        expected: true
      };
      throw err;
    }

    // Delete all physical files from disk
    const classDir = path.join(FINAL_UPLOADS_DIR, classIdNum.toString());
    for (const file of uploadData.Files) {
      const filePath = path.join(classDir, file.storedFileName);
      await fs.unlink(filePath).catch(() => { });
    }

    // Calculate actual size (for completed uploads) or reserved size (for failed/queued)
    const sizeToRelease = uploadData.status === "completed"
      ? BigInt(uploadData.Files.reduce((sum, file) => sum + file.size, 0))
      : uploadData.reservedBytes;

    await prisma.$transaction(async tx => {
      // Delete the upload record
      await tx.upload.delete({
        where: { uploadId }
      });

      // Update class storage usage
      if (sizeToRelease > 0n) {
        await tx.class.update({
          where: { classId: classIdNum },
          data: { storageUsedBytes: { decrement: sizeToRelease } }
        });
      }
    });

    // Invalidate cache after delete
    await invalidateCache("UPLOADMETADATA", session.classId!);

    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.UPLOADS);
  },

  async addUploadRequest(
    body: addUploadRequestTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { uploadRequestName, teamId } = body;
    const classIdNum = parseInt(session.classId!, 10);

    await isValidTeamId(teamId, session);

    await prisma.uploadRequest.create({
      data: {
        uploadRequestName: uploadRequestName,
        classId: classIdNum,
        teamId
      }
    });

    await invalidateCache("UPLOADREQUESTS", session.classId!);

    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.UPLOAD_REQUESTS);
  },

  async getUploadRequests(session: Session & Partial<SessionData>) {
    const classIdNum = parseInt(session.classId!, 10);

    const getUploadRequestsCacheKey = generateCacheKey(CACHE_KEY_PREFIXES.UPLOADREQUESTS, session.classId!);
    const cachedData = await redisClient.get(getUploadRequestsCacheKey);

    if (cachedData) {
      try {
        return JSON.parse(cachedData);
      }
      catch (error) {
        logger.error(`Error parsing Redis data: ${error}`);
        // Fall through to fetch from database
      }
    }

    const uploadRequests = await prisma.uploadRequest.findMany({
      where: { classId: classIdNum },
      orderBy: { uploadRequestId: "desc" }
    });

    try {
      await updateCacheData(uploadRequests, getUploadRequestsCacheKey);
    }
    catch (err) {
      logger.error(`Error updating Redis data: ${err}`);
      // Continue without caching
    }

    const stringified = JSON.stringify(uploadRequests, BigIntreplacer);
    return JSON.parse(stringified);
  },

  async deleteUploadRequest(
    body: deleteUploadRequestTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { uploadRequestId } = body;
    const classIdNum = parseInt(session.classId!, 10);

    // Check if upload request exists and belongs to this class
    const existingRequest = await prisma.uploadRequest.findUnique({
      where: { uploadRequestId }
    });

    if (!existingRequest || existingRequest.classId !== classIdNum) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "Upload request not found",
        expected: true
      };
      throw err;
    }

    await prisma.uploadRequest.delete({ where: { uploadRequestId } });

    await invalidateCache("UPLOADREQUESTS", session.classId!);

    const io = socketIO.getIO();
    io.to(`class:${session.classId}`).emit(SOCKET_EVENTS.UPLOAD_REQUESTS);
  }
};

export default uploadService;
