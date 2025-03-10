const { Op } = require('sequelize');
const Homework = require('./models/homework');
const logger = require('../logger');

/**
 * Deletes homework records that are older than 30 days based on submission date
 */
async function cleanupOldHomework() {
  try {
    logger.setStandardPrefix("[CronJob]");
    // Calculate the timestamp for 60 days ago (in milliseconds)
    const thirtyDaysAgo = Date.now() - (60 * 24 * 60 * 60 * 1000);
    
    // Find and count records to be deleted
    const count = await Homework.count({
      where: {
        submissionDate: {
          [Op.lt]: thirtyDaysAgo
        }
      }
    });
    
    // Delete records older than 30 days
    const result = await Homework.destroy({
      where: {
        submissionDate: {
          [Op.lt]: thirtyDaysAgo
        }
      }
    });
    
    logger.info("Homework cleanup completed: ", result, "records deleted out of ", count, " found");
  } catch (error) {
    logger.error('Error during homework cleanup:', error);
  }
}

module.exports = {
  cleanupOldHomework
}