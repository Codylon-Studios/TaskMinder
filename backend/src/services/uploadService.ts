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
import { deleteUploadFileGroupTypeBody, renameUploadFileGroupTypeBody } from "../schemas/uploadSchema";


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
  // eslint-disable-next-line complexity
  async setUploadFile(
    // now accepts multiple and verified mime list
    files: Express.Multer.File[],
    verifiedMimes: string[],
    session: Session & Partial<SessionData>,
    fileGroupName?: string
  ) {
    if (!files || files.length === 0) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "No file was uploaded",
        expected: true
      };
      throw err;
    }

    // group name required if uploading multiple files
    if (files.length > 1 && !fileGroupName) {
      const err: RequestError = {
        name: "Bad Request",
        status: 400,
        message: "fileGroupName is required when uploading multiple files",
        expected: true
      };
      throw err;
    }

    const classIdNum = parseInt(session.classId!, 10);
    const finalDirectory = path.join(FINAL_UPLOADS_DIR, session.classId!);
    await fs.mkdir(finalDirectory, { recursive: true });

    // actual sizes after sanitization
    const fileSizes: number[] = [];
    for (const f of files) {
      const stat = await fs.stat(f.path);
      fileSizes.push(stat.size);
    }
    const totalBytes = fileSizes.reduce((acc, n) => acc + BigInt(n), BigInt(0));

    // quota re-check using actual bytes
    const classQuota = await prisma.class.findUnique({
      where: { classId: classIdNum },
      select: { storageQuotaBytes: true, storageUsedBytes: true }
    });
    if (!classQuota) {
      throw {
        name: "Not Found",
        status: 404,
        message: "Class not found",
        expected: true
      } as RequestError;
    }
    if (classQuota.storageUsedBytes + totalBytes > classQuota.storageQuotaBytes) {
      // cleanup temp files
      await Promise.all(files.map(f => fs.unlink(f.path).catch(() => {})));
      const err: RequestError = {
        name: "Insufficient Storage",
        status: 507,
        message: "Class quota was exceeded",
        expected: false
      };
      throw err;
    }

    // create file group if applicable
    let fileGroupId: number | null = null;
    if (fileGroupName) {
      // enforce unique per class
      const existing = await prisma.fileGroup.findFirst({
        where: {
          classId: classIdNum,
          name: fileGroupName
        },
        select: { fileGroupId: true }
      });
      if (existing) {
        const err: RequestError = {
          name: "Conflict",
          status: 409,
          message: "A file group with this name already exists in the class.",
          expected: true
        };
        // cleanup temp files
        await Promise.all(files.map(f => fs.unlink(f.path).catch(() => {})));
        throw err;
      }
      const created = await prisma.fileGroup.create({
        data: {
          classId: classIdNum,
          name: fileGroupName,
          createdAt: BigInt(Date.now()),
          createdBy: session.account?.accountId ?? null
        }
      });
      fileGroupId = created.fileGroupId;
    }

    // plan moves
    const finalFilenames: string[] = files.map((_, i) => {
      const ext = mime.extension(verifiedMimes[i]) || "bin";
      return `${randomUUID()}.${ext}`;
    });
    const finalPaths = finalFilenames.map(n => path.join(finalDirectory, n));

    // move and create DB in a transaction
    const moved: string[] = [];
    try {
      // move files first
      for (let i = 0; i < files.length; i++) {
        await fs.rename(files[i].path, finalPaths[i]);
        moved.push(finalPaths[i]);
      }

      await prisma.$transaction(async tx => {
        for (let i = 0; i < files.length; i++) {
          await tx.fileData.create({
            data: {
              accountId: session.account!.accountId,
              classId: classIdNum,
              fileGroupId: fileGroupId ?? undefined,
              originalName: files[i].originalname,
              storedFileName: finalFilenames[i],
              mimeType: verifiedMimes[i],
              size: fileSizes[i],
              createdAt: BigInt(Date.now())
            }
          });
        }
        await tx.class.update({
          where: { classId: classIdNum },
          data: { storageUsedBytes: { increment: totalBytes } }
        });
      });
    }
    catch (error) {
      logger.error("Failed to create file metadata in DB. Cleaning up orphaned files.", error);
      // cleanup moved files
      await Promise.all(moved.map(p => fs.unlink(p).catch(() => {})));
      // cleanup any remaining temp files not moved
      await Promise.all(files.map(f => fs.unlink(f.path).catch(() => {})));
      // rollback group if it was just created with no files
      if (fileGroupId) {
        await prisma.fileGroup.delete({ where: { fileGroupId } }).catch(() => {});
      }
      const err: RequestError = {
        name: "Internal Server Error",
        status: 500,
        message: "Failed to store file(s)",
        expected: false
      };
      throw err;
    }
  },

  async getUploadDataList(isGetAllData: boolean, session: Session & Partial<SessionData>) {
    const classId = parseInt(session.classId!, 10);

    const totalUploads = await prisma.fileData.count({
      where: { classId }
    });

    if (totalUploads === 0) {
      return {
        totalUploads: 0,
        uploads: [],
        hasMore: false
      };
    }

    // include Account username and group info
    const include = {
      Account: { select: { username: true } },
      FileGroup: { select: { fileGroupId: true, name: true } }
    } as const;

    const orderBy = { createdAt: "desc" } as const;

    let fileMetaData;
    if (isGetAllData) {
      fileMetaData = await prisma.fileData.findMany({
        where: { classId },
        include,
        orderBy
      });
    } 
    else {
      fileMetaData = await prisma.fileData.findMany({
        where: { classId },
        include,
        orderBy,
        take: 50
      });
    }

    const uploads = fileMetaData.map(file => ({
      fileId: file.fileId,
      accountName: file.Account?.username ?? null,
      originalName: file.originalName,
      createdAt: file.createdAt,
      mimeType: file.mimeType,
      size: file.size,
      // group info
      fileGroupId: file.FileGroup?.fileGroupId ?? null,
      fileGroupName: file.FileGroup?.name ?? null
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
  },
  // new: rename file group
  async renameFileGroup(
    body: renameUploadFileGroupTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const classId = parseInt(session.classId!, 10);
    const { groupId, newGroupName } = body;

    const group = await prisma.fileGroup.findUnique({ where: { fileGroupId: groupId } });
    if (!group || group.classId !== classId) {
      throw {
        name: "Not Found",
        status: 404,
        message: "File group not found.",
        expected: true
      } as RequestError;
    }

    // enforce unique per class
    const existing = await prisma.fileGroup.findFirst({
      where: {
        classId,
        name: newGroupName,
        NOT: { fileGroupId: groupId }
      },
      select: { fileGroupId: true }
    });
    if (existing) {
      throw {
        name: "Conflict",
        status: 409,
        message: "A file group with this name already exists.",
        expected: true
      } as RequestError;
    }

    await prisma.fileGroup.update({
      where: { fileGroupId: groupId },
      data: { name: newGroupName }
    });
  },

  // new: delete file group (and its files)
  async deleteFileGroup(
    body: deleteUploadFileGroupTypeBody,
    session: Session & Partial<SessionData>
  ) {
    const classId = parseInt(session.classId!, 10);
    const { groupId } = body;

    const group = await prisma.fileGroup.findUnique({
      where: { fileGroupId: groupId },
      include: { files: true }
    });
    if (!group || group.classId !== classId) {
      throw {
        name: "Not Found",
        status: 404,
        message: "File group not found.",
        expected: true
      } as RequestError;
    }

    // delete files from disk
    await Promise.all(group.files.map(f => {
      const p = path.join(FINAL_UPLOADS_DIR, classId.toString(), f.storedFileName);
      return fs.unlink(p).catch(err => {
        if (err.code !== "ENOENT") logger.error(`Error deleting file on disk ${p}`, err);
      });
    }));

    const totalBytes = group.files.reduce((acc, f) => acc + BigInt(f.size), BigInt(0));

    // delete rows and decrement storage
    await prisma.$transaction(async tx => {
      await tx.fileData.deleteMany({ where: { fileGroupId: groupId } });
      await tx.fileGroup.delete({ where: { fileGroupId: groupId } });
      if (totalBytes > 0n) {
        await tx.class.update({
          where: { classId },
          data: { storageUsedBytes: { decrement: totalBytes } }
        });
      }
    });
  }
};

export default uploadService;
