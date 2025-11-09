import { Session, SessionData } from "express-session";
import path from "path";
import { FINAL_UPLOADS_DIR } from "../config/upload";
import fs from "fs/promises";
import { ReadStream, createReadStream } from "fs";
import prisma from "../config/prisma";
import logger from "../config/logger";
import { RequestError } from "../@types/requestError";
import { deleteUploadTypeBody, getUploadFileType, editUploadTypeBody, uploadFileTypeBody } from "../schemas/upload.schema";
import { queueJob, QUEUE_KEYS, generateCacheKey, CACHE_KEY_PREFIXES, redisClient } from "../config/redis";
import { invalidateUploadCache } from "../utils/validate.functions";
import { BigIntreplacer, isValidTeamId, isValidUploadInput, updateCacheData } from "../utils/validate.functions";


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
    uploadType: upload.uploadType,
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
    const { uploadName, uploadType, teamId: teamIdStr } = body;
    const teamId = Number.parseInt(teamIdStr, 10);

    await isValidTeamId(teamId, session);
    await isValidUploadInput(uploadName, uploadType);

    const classIdNum = Number.parseInt(session.classId!, 10);
    const accountId = session.account?.accountId ?? null;

    const upload = await prisma.upload.create({
      data: {
        uploadName,
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
    await invalidateUploadCache(session.classId!);

    logger.info(`Queued upload ${upload.uploadId} with ${files.length} file(s)`);
  },

  async getUploadMetadata(isGetAllData: boolean, session: Session & Partial<SessionData>) {
    const classId = parseInt(session.classId!, 10);

    const classInformation = await prisma.class.findUnique({
      where: {
        classId: classId
      },
      select: {
        storageUsedBytes: true,
        storageQuotaBytes: true
      }
    });

    const totalUploads = await prisma.upload.count({
      where: {
        classId
      }
    });

    if (totalUploads === 0) {
      return {
        totalUploads: 0,
        uploads: [],
        hasMore: false,
        totalStorage: classInformation!.storageQuotaBytes,
        usedStorage: classInformation!.storageUsedBytes
      };
    }

    const include = {
      Account: { select: { username: true } },
      Files: true
    } as const;

    const orderBy = { createdAt: "desc" } as const;

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
          logger.error("Error parsing Redis data:", error);
          // Fall through to fetch from database
        }
      }

      // Only fetch from database if cache miss or parse error
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
          logger.error("Error updating Redis cache:", err);
          // Continue without caching
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
        Upload: { select: { classId: true } }
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
    // Remove or escape problematic characters for Content-Disposition
    const safeOriginalName = fileData.storedFileName
      .replace(/[\r\n]/g, "") // Remove newlines that could enable header injection
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
    session: Session & Partial<SessionData>
  ) {
    const { uploadId, uploadName, uploadType, teamId } = body;
    const classIdNum = parseInt(session.classId!, 10);

    await isValidTeamId(teamId, session);
    await isValidUploadInput(uploadName, uploadType);

    await prisma.upload.update({
      where: { uploadId: uploadId, classId: classIdNum },
      data: { uploadName: uploadName, uploadType: uploadType, teamId: teamId }
    });

    // Invalidate cache after edit
    await invalidateUploadCache(session.classId!);
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
      // Delete all file metadata records
      await tx.fileMetadata.deleteMany({
        where: { uploadId }
      });

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
    await invalidateUploadCache(session.classId!);
  }
};

export default uploadService;
