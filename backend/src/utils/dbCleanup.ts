import prisma from "../config/prisma";
import logger from "./logger";

/**
 * Deletes class records that are older than 1 day and are a TEST CLASSES
 */
export async function cleanupTestClasses() {
  try {
    logger.setStandardPrefix("[CronJob]");

    // Calculate the timestamp for 1 day ago (in milliseconds)
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    // Count records to be deleted
    const count = await prisma.class.count({
      where: {
        classCreated: {
          lt: oneDayAgo
        },
        isTestClass: true
      }
    });

    // Delete the records
    const deleted = await prisma.class.deleteMany({
      where: {
        classCreated: {
          lt: oneDayAgo
        },
        isTestClass: true
      }
    });

    logger.info("Test Class cleanup completed:", deleted.count, "records deleted out of", count, "found");
  }
  catch (error) {
    logger.error("Error during test class cleanup:", error);
  }
}

/**
 * Deletes homework records that are older than 30 days based on submission date
 */
export async function cleanupOldHomework() {
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
