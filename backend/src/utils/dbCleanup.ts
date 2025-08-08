import prisma from "../config/prisma";
import { redisClient } from "../config/redis";
import logger from "./logger";

/**
 * Deletes class records that are older than 1 day and are a TEST CLASSES
 */
export async function cleanupTestClasses(): Promise<void> {
  try {
    logger.setStandardPrefix("[CronJob]");

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

    const [updatedAccounts, deletedJoins] = await prisma.$transaction([
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

    logger.info("Test Class cleanup completed: " + classesToDelete.length + " classes deleted, " + deletedJoins.count +
       " join records removed, and " + updatedAccounts.count +" accounts updated."
    );
  }
  catch (error) {
    logger.error("Error during test class cleanup:", error);
  }
}

/**
 * Deletes deleted accounts records that are older than 30 days based on deletedOn date
 */
export async function cleanupDeletedAccounts(): Promise<void> {
  try {
    logger.setStandardPrefix("[CronJob]");

    // Calculate the timestamp for 30 days ago (in milliseconds)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    // Count records to be deleted
    const count = await prisma.deletedAccount.count({
      where: {
        deletedOn: {
          lt: thirtyDaysAgo
        }
      }
    });

    // Delete the records
    const deleted = await prisma.deletedAccount.deleteMany({
      where: {
        deletedOn: {
          lt: thirtyDaysAgo
        }
      }
    });

    logger.info("Deleted accounts cleanup completed:", deleted.count, "records deleted out of", count, "found");
  } 
  catch (error) {
    logger.error("Error during deleted account cleanup:", error);
  }
}

/**
 * Deletes homework records that are older than 60 days based on submission date
 */
export async function cleanupOldHomework(): Promise<void> {
  try {
    logger.setStandardPrefix("[CronJob]");

    // Calculate the timestamp for 60 days ago (in milliseconds)
    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;

    // Count records to be deleted
    const count = await prisma.homework.count({
      where: {
        submissionDate: {
          lt: sixtyDaysAgo
        }
      }
    });

    // Delete the records
    const deleted = await prisma.homework.deleteMany({
      where: {
        submissionDate: {
          lt: sixtyDaysAgo
        }
      }
    });

    logger.info("Homework cleanup completed:", deleted.count, "records deleted out of", count, "found");
  } 
  catch (error) {
    logger.error("Error during homework cleanup:", error);
  }
}
