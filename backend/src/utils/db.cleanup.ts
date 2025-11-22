import prisma from "../config/prisma";
import { redisClient } from "../config/redis";
import logger from "../config/logger";
import fs from "fs/promises";
import path from "path";
import { FINAL_UPLOADS_DIR } from "../config/upload";

/**
 * Deletes class records that are older than 1 day and are TEST CLASSES
 */
// @codescene(disable:"Large Method")
// This is supressed as this function is for deleting test classes.
// As a lot of data is connected to a class, many prisma functions need to be called,
// thus increasing lines of code, but code is still logical
// This will not get better as code <-> cascade stuff will be introduced in the future
export async function cleanupTestClasses(): Promise<void> {
  try {
    // Calculate the timestamp for 1 day ago (in milliseconds)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    const classesToDelete = await prisma.class.findMany({
      where: {
        classCreated: {
          lt: oneDayAgo
        },
        isTestClass: true
      },
      select: {
        classId: true
      }
    });

    if (classesToDelete.length === 0) {
      logger.info("Test Class cleanup: No old test classes found to delete.");
      return;
    }

    const classIdsToDelete = classesToDelete.map(c => c.classId);

    // Delete physical files for each class
    for (const classId of classIdsToDelete) {
      const classDir = path.join(FINAL_UPLOADS_DIR, classId.toString());
      try {
        await fs.rm(classDir, { recursive: true, force: true });
        logger.info(`Deleted class directory: ${classDir}`);
      }
      catch (error) {
        logger.error(`Error deleting class directory ${classDir}: ${error}`);
        // Continue with database cleanup even if file deletion fails
      }
    }

    const [deletedFileMetadata, deletedUploads, deletedJoins] = await prisma.$transaction([
      // Delete all file metadata for uploads in these classes
      prisma.fileMetadata.deleteMany({
        where: {
          Upload: {
            classId: {
              in: classIdsToDelete
            }
          }
        }
      }),

      // Delete all uploads for these classes
      prisma.upload.deleteMany({
        where: {
          classId: {
            in: classIdsToDelete
          }
        }
      }),

      prisma.joinedClass.deleteMany({
        where: {
          classId: {
            in: classIdsToDelete
          }
        }
      }),

      prisma.class.deleteMany({
        where: {
          classId: {
            in: classIdsToDelete
          }
        }
      })
    ]);

    await Promise.all(
      classIdsToDelete.map(classId =>
        redisClient.del(`auth_class:${classId}`)
      )
    );

    logger.info(
      `Test Class cleanup completed: ${classesToDelete.length} classes deleted, ` +
      `${deletedFileMetadata.count} file metadata records removed, ` +
      `${deletedUploads.count} uploads removed, ` +
      `${deletedJoins.count} join records removed. (1d)`
    );
  }
  catch (error) {
    logger.error(`Error during test class cleanup: ${error}`);
  }
}

/**
 * Deletes deleted accounts records that are older than 30 days based on deletedAt date
 */
export async function cleanupDeletedAccounts(): Promise<void> {
  try {
    // Calculate the timestamp for 30 days ago (in milliseconds)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Count records to be deleted
    const count = await prisma.account.count({
      where: {
        deletedAt: {
          lt: thirtyDaysAgo
        }
      }
    });

    // Delete the records
    const deleted = await prisma.account.deleteMany({
      where: {
        deletedAt: {
          lt: thirtyDaysAgo
        }
      }
    });

    logger.info(`Deleted accounts cleanup completed: ${deleted.count} records deleted out of ${count} found (30d)`);
  }
  catch (error) {
    logger.error(`Error during deleted account cleanup: ${error}`);
  }
}

/**
 * Deletes homework records that are older than 90 days based on submission date
 */
export async function cleanupOldHomework(): Promise<void> {
  try {
    // Calculate the timestamp for 90 days ago (in milliseconds)
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;

    // Count records to be deleted
    const count = await prisma.homework.count({
      where: {
        submissionDate: {
          lt: ninetyDaysAgo
        }
      }
    });

    // Delete the records
    const deleted = await prisma.homework.deleteMany({
      where: {
        submissionDate: {
          lt: ninetyDaysAgo
        }
      }
    });

    logger.info(`Homework cleanup completed: ${deleted.count} records deleted out of ${count} found (90d)`);
  }
  catch (error) {
    logger.error(`Error during homework cleanup: ${error}`);
  }
}


/**
 * Deletes event records that are older than 1 year based on start date
 */
export async function cleanupOldEvents(): Promise<void> {
  try {
    // Calculate the timestamp for 365 days ago (in milliseconds)
    const aYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;

    // Count records to be deleted
    const count = await prisma.event.count({
      where: {
        startDate: {
          lt: aYearAgo
        }
      }
    });

    // Delete the records
    const deleted = await prisma.event.deleteMany({
      where: {
        startDate: {
          lt: aYearAgo
        }
      }
    });

    logger.info(`Event cleanup completed: ${deleted.count} records deleted out of ${count} found (365d)`);
  }
  catch (error) {
    logger.error(`Error during event cleanup: ${error}`);
  }
}


/**
 * Cleans up uploads stuck in "processing" status for more than 10 minutes
 * and releases their reserved storage
 */
export async function cleanupStuckUploads(): Promise<void> {
  try {
    // 10 minutes ago
    const tenMinutesAgo = Date.now() - 10 * 60 * 1000;

    const stuckUploads = await prisma.upload.findMany({
      where: {
        status: "processing",
        createdAt: {
          lt: tenMinutesAgo
        }
      },
      select: {
        uploadId: true,
        classId: true,
        reservedBytes: true
      }
    });

    if (stuckUploads.length === 0) {
      logger.info("No stuck uploads found (10min)");
      return;
    }

    // Release reserved storage and mark as failed
    for (const upload of stuckUploads) {
      await prisma.$transaction(async tx => {
        if (upload.reservedBytes > 0n) {
          await tx.class.update({
            where: { classId: upload.classId },
            data: { storageUsedBytes: { decrement: upload.reservedBytes } }
          });
        }

        await tx.upload.update({
          where: { uploadId: upload.uploadId },
          data: {
            status: "failed",
            errorReason: "processing_timeout",
            reservedBytes: 0n
          }
        });
      });
    }

    logger.info(`Cleaned up ${stuckUploads.length} stuck uploads (10min)`);
  }
  catch (error) {
    logger.error(`Error during stuck upload cleanup: ${error}`);
  }
}


/*
  * Moves events and homework 1 week further along for demo class
*/
export async function migrateEventAndHomeworkDates(): Promise<void> {
  try {
    const oneWeekInMs = 7 * 24 * 60 * 60 * 1000;

    const demoClass = await prisma.class.findFirst({
      where: {
        className: "demo",
        classCode: "demo"
      }
    });

    if (!demoClass) {
      logger.info("Demo class not found. Migration of dates for homework and events not needed.");
      return;
    }

    const [, migratedEvents, migratedHomework] = await prisma.$transaction([
      // Events:
      // case 1: startDate given, endDate null -> this event is all day
      // only move startDate one week along
      // case 2: startDate and endDAte are given -> event spans across multiple days
      // move startDate AND endDate along
      prisma.$executeRaw`
        UPDATE "event"
        SET
          "startDate" = "startDate" + ${oneWeekInMs},
          "endDate" = CASE
                        WHEN "endDate" IS NOT NULL THEN "endDate" + ${oneWeekInMs}
                        ELSE NULL
                      END
        WHERE "classId" = ${demoClass.classId}
      `,

      prisma.event.findMany({
        where: { classId: demoClass.classId }
      }),

      prisma.homework.updateMany({
        where: {
          classId: demoClass.classId
        },
        data: {
          assignmentDate: {
            increment: oneWeekInMs
          },
          submissionDate: {
            increment: oneWeekInMs
          }
        }
      })
    ]);

    logger.info(
      `Migrated dates of ${migratedEvents.length} events and ${migratedHomework.count} homework entries for demo class. (1 week)`
    );
  }
  catch (error) {
    logger.error(`Error during event and homework migration: ${error}`);
  }
}
