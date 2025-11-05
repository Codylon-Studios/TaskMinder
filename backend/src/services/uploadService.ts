import { Session, SessionData } from "express-session";
import path from "path";
import { FileTypes, FINAL_UPLOADS_DIR } from "../config/upload";
import fs from "fs/promises";
import { ReadStream, createReadStream } from "fs";
import prisma from "../config/prisma";
import logger from "../utils/logger";
import { RequestError } from "../@types/requestError";
import { deleteUploadTypeBody, getUploadFileType, renameUploadTypeBody, setUploadFileTypeBody } from "../schemas/uploadSchema";
import { queueJob, QUEUE_KEYS } from "../config/redis";
import { BigIntreplacer } from "../utils/validateFunctions";


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

const uploadService = {
  async queueFileUpload(
    files: Express.Multer.File[],
    session: Session & Partial<SessionData>,
    body: setUploadFileTypeBody,
    reservedBytes: bigint
  ) {
    const { uploadName, uploadType, teamId: teamIdStr } = body;
    const teamId = Number.parseInt(teamIdStr);
    if (uploadName === "" || Number.isNaN(teamId) || !Object.values(FileTypes).includes(uploadType)) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "Please give a valid name, a teamId (int) and a valid file type (INFO_SHEET,LESSON_NOTE,WORKSHEET,IMAGE,FILE,TEXT)",
        expected: true
      };
      throw err;
    }

    const classIdNum = Number.parseInt(session.classId!, 10);
    const accountId = session.account?.accountId ?? null;

    // Create Upload record with "queued" status and reserved bytes
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

    // Prepare job data
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

    // Queue the job
    await queueJob(QUEUE_KEYS.FILE_PROCESSING, jobData);

    logger.info(`Queued upload ${upload.uploadId} with ${files.length} file(s)`);

    return {
      uploadId: upload.uploadId,
      filesCount: files.length
    };
  },

  async getUploadMetadata(isGetAllData: boolean, session: Session & Partial<SessionData>) {
    const classId = parseInt(session.classId!, 10);

    const totalUploads = await prisma.upload.count({
      where: { 
        classId
      }
    });

    if (totalUploads === 0) {
      return {
        totalUploads: 0,
        uploads: [],
        hasMore: false
      };
    }

    const include = {
      Account: { select: { username: true } },
      Files: true
    } as const;

    const orderBy = { createdAt: "desc" } as const;

    let uploads;
    if (isGetAllData) {
      uploads = await prisma.upload.findMany({
        where: { classId },
        include,
        orderBy
      });
    } 
    else {
      uploads = await prisma.upload.findMany({
        where: { classId },
        include,
        orderBy,
        take: 100
      });
    }

    const uploadList = uploads.map(upload => ({
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

    const hasMore = !isGetAllData && totalUploads > 100;

    const res =  {
      totalUploads,
      uploads: uploadList,
      hasMore
    };
    const stringified = JSON.stringify(res, BigIntreplacer);
    return JSON.parse(stringified);
  },

  async getUploadFile({ fileIdParam, action, classId }: GetUploadFileInput): Promise<GetUploadFileResult> {
    const fileData = await prisma.fileMetadata.findUnique({
      where: { fileMetaDataId: fileIdParam },
      include: {
        Upload: true
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
    const safeOriginalName = fileData.storedFileName.replace(/"/g, '\\"');
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
  async renameUpload(
    body: renameUploadTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { uploadId, newUploadName } = body;
    const classIdNum = parseInt(session.classId!, 10);

    await prisma.upload.update({
      where: { uploadId: uploadId, classId: classIdNum },
      data: { uploadName: newUploadName }
    });
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
      await fs.unlink(filePath).catch(() => {});
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
  }
};

export default uploadService;
