import prisma from "../config/prisma";
import logger from "./logger";

/**
 * Deletes homework records that are older than 30 days based on submission date
 */
export default async function cleanupOldHomework() {
  try {
    logger.setStandardPrefix("[CronJob]");

    // Calculate the timestamp for 60 days ago (in milliseconds)
    const sixtyDaysAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;

    // Count records to be deleted
    const count = await prisma.homework10d.count({
      where: {
        submissionDate: {
          lt: sixtyDaysAgo
        }
      }
    });

    // Delete the records
    const deleted = await prisma.homework10d.deleteMany({
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
