import { Session, SessionData } from "express-session";
import { randomUUID } from "crypto";
import path from "path";
import { FINAL_UPLOADS_DIR } from "../middleware/uploadMiddleware";
import fs from "fs/promises";
import { ReadStream, createReadStream } from "fs";
import prisma from "../config/prisma";
import mime from "mime";
import logger from "../utils/logger";
import { RequestError } from "../@types/requestError";
import { deleteUploadFileTypeBody, getUploadFileType, renameUploadFileTypeBody } from "../schemas/uploadSchema";


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
  async setUploadFile(
    fileData: Express.Multer.File,
    verifiedMime: string,
    session: Session & Partial<SessionData>
  ) {
    const finalExtension = mime.extension(verifiedMime);
    const finalFilename = `${randomUUID()}.${finalExtension}`;
    const tempFilePath = fileData.path;

    const finalDirectory = path.join(FINAL_UPLOADS_DIR, session.classId!);
    const finalFilePath = path.join(finalDirectory, finalFilename);

    const stat = await fs.stat(tempFilePath);
    const actualBytes = stat.size;
    const actualBytesBig: bigint = BigInt(actualBytes);

    // check if quota is reached
    const classQuota = await prisma.class.findUnique({
      where: {
        classId: parseInt(session.classId!, 10)
      },
      select: {
        storageQuotaBytes: true,
        storageUsedBytes: true
      }
    });

    if (classQuota!.storageUsedBytes + actualBytesBig > classQuota!.storageQuotaBytes) {
      await fs.unlink(fileData.path);
      const err: RequestError = {
        name: "Insufficient Storage",
        status: 507,
        message: "Class quota was exceeded",
        expected: false
      };
      throw err;
    }

    await fs.mkdir(finalDirectory, { recursive: true });

    try {
      await fs.rename(tempFilePath, finalFilePath);

      await prisma.$transaction(async tx => {
        await tx.fileData.create({
          data: {
            accountId: session.account!.accountId,
            classId: parseInt(session.classId!, 10),
            originalName: fileData.originalname,
            storedFileName: finalFilename,
            mimeType: verifiedMime,
            size: actualBytes,
            createdAt: BigInt(Date.now())
          }
        });
        // increase storage count in class
        await tx.class.update({
          where: { classId: parseInt(session.classId!, 10) },
          data: { storageUsedBytes: { increment: actualBytesBig } }
        });
      });
    }
    catch (error) {
      logger.error("Failed to create file metadata in DB. Cleaning up orphaned file.", error);
      await fs.unlink(finalFilePath);
      const err: RequestError = {
        name: "Internal Server Error",
        status: 500,
        message: "Falied to create file metadata in database",
        expected: false
      };
      throw err;
    }
  },
  async getUploadDataList(isGetAllData: boolean, session: Session & Partial<SessionData>) {
    const classId = parseInt(session.classId!, 10);

    const totalUploads = await prisma.fileData.count({
      where: {
        classId: classId
      }
    });

    if (totalUploads === 0) {
      return {
        totalUploads: 0,
        uploads: [],
        hasMore: false
      };
    }

    let fileMetaData;

    if (isGetAllData) {
      fileMetaData = await prisma.fileData.findMany({
        where: {
          classId: classId
        },
        include: {
          Account: {
            select: {
              username: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });
    }
    else {
      fileMetaData = await prisma.fileData.findMany({
        where: {
          classId: classId
        },
        include: {
          Account: {
            select: {
              username: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 50
      });
    }

    const uploads = fileMetaData.map(file => ({
      fileId: file.fileId,
      accountName: file.Account?.username ?? null,
      originalName: file.originalName,
      createdAt: file.createdAt,
      mimeType: file.mimeType,
      size: file.size
    }));

    const hasMore = !isGetAllData && totalUploads > 50;

    return {
      totalUploads,
      uploads,
      hasMore
    };
  },
  async getUploadFile({ fileIdParam, action, classId }: GetUploadFileInput): Promise<GetUploadFileResult> {

    const fileData = await prisma.fileData.findUnique({ where: { fileId: fileIdParam } });

    if (!fileData || fileData.classId !== parseInt(classId, 10)) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "File not found or access denied.",
        expected: true
      };
      throw err;
    }

    const disposition = action === "download" ? "attachment" : "inline";
    const safeOriginalName = fileData.originalName.replace(/"/g, '\\"');
    const headers = {
      "Content-Type": fileData.mimeType,
      "Content-Disposition": `${disposition}; filename="${safeOriginalName}"`,
      "Cache-Control": "private, no-store"
    };

    const finalFilePath = path.join(
      FINAL_UPLOADS_DIR,
      fileData.classId.toString(),
      fileData.storedFileName
    );

    try {
      await fs.access(finalFilePath, fs.constants.R_OK);
    }
    catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") {
        logger.error(`File not found on disk, but exists in DB: ${finalFilePath}`);
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
  async renameUploadFile(
    body: renameUploadFileTypeBody,
    session: Session & Partial<SessionData>) {

    const { fileId, newFileName } = body;

    const foundFile = await prisma.fileData.findUnique({
      where: {
        fileId: fileId
      }
    });
    // answer with same status code to confuse potential hackers
    if (!foundFile || foundFile.classId !== parseInt(session.classId!, 10)) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "File not found on server.",
        expected: true
      };
      throw err;
    }

    await prisma.fileData.update({
      where: {
        fileId: fileId,
        classId: parseInt(session.classId!, 10)
      },
      data: {
        originalName: newFileName
      }
    });
  },
  async deleteUploadFile(
    body: deleteUploadFileTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const { fileId } = body;

    const foundFile = await prisma.fileData.findUnique({
      where: {
        fileId: fileId
      }
    });
    // answer with same status code to confuse potential hackers
    if (!foundFile || foundFile.classId !== parseInt(session.classId!, 10)) {
      const err: RequestError = {
        name: "Not Found",
        status: 404,
        message: "File not found on server.",
        expected: true
      };
      throw err;
    }

    const finalFilePath = path.join(
      FINAL_UPLOADS_DIR,
      foundFile.classId.toString(),
      foundFile.storedFileName
    );
    await fs.unlink(finalFilePath);

    await prisma.$transaction(async tx => {
      await tx.fileData.delete({
        where: {
          fileId: fileId
        }
      });
      await tx.class.update({
        where: { classId: foundFile.classId },
        data: { storageUsedBytes: { decrement: BigInt(foundFile.size) } }
      });
    });
  }
};

export default uploadService;
