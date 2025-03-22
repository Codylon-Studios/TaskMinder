const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const logger = require("../logger");
require("dotenv").config();

const DB_USER = process.env.DB_USER;
const DB_NAME = process.env.DB_NAME;
const CONTAINER_NAME = "taskminder-postgres";
const BACKUP_DIR = "/backups";
const MAX_BACKUPS = 48;
const IS_PRODUCTION = process.env.NODE_ENV === "PRODUCTION";

function createDBBackup() {
  return new Promise((resolve, reject) => {
    if (!IS_PRODUCTION) {
      logger.info("Skipping backup - not in production environment");
      resolve(null);
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `backup_${timestamp}.sql`;
    const backupFile = `/backups/${backupFileName}`;
    const command = `sudo docker exec -t ${CONTAINER_NAME} pg_dump -U ${DB_USER} -d ${DB_NAME} -f ${backupFile}`;

    logger.info(`Executing backup command: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error("Error creating backup:", error.message);
        reject(error);
        return;
      }
      
      if (stderr && !stderr.includes("warning")) {
        logger.error("Backup stderr: ", stderr);
        reject(new Error(stderr));
        return;
      }
      
      logger.info(`Backup successfully saved as ${backupFile}`);
      
      // Clean up old backups
      cleanOldBackups()
        .then(() => resolve(backupFile))
        .catch(err => {
          logger.error("Error during cleanup:", err);
          resolve(backupFile);
        });
    });
  });
}

function cleanOldBackups() {
  return new Promise((resolve, reject) => {
    if (!IS_PRODUCTION) {
      logger.info("Skipping cleanup - not in production environment");
      resolve();
      return;
    }
    
    const backupDirPath = BACKUP_DIR;
    logger.info(`Cleaning old backups in ${backupDirPath}, keeping ${MAX_BACKUPS} most recent`);
    
    fs.readdir(backupDirPath, (err, files) => {
      if (err) {
        logger.error("Error reading backup directory: ", err.message);
        reject(err);
        return;
      }
      
      try {
        const sqlFiles = files
          .filter(file => file.endsWith(".sql") && file.startsWith("backup_"))
          .map(file => ({
            file,
            path: path.join(backupDirPath, file),
            time: fs.statSync(path.join(backupDirPath, file)).birthtimeMs || 
                  fs.statSync(path.join(backupDirPath, file)).mtimeMs // Fallback to modified time
          }))
          .sort((a, b) => a.time - b.time); // Oldest first
        
        if (sqlFiles.length > MAX_BACKUPS) {
          const filesToDelete = sqlFiles.slice(0, sqlFiles.length - MAX_BACKUPS);
          logger.info(`Found ${sqlFiles.length} backups, deleting ${filesToDelete.length} oldest`);
          
          const deletePromises = filesToDelete.map(({ file, path }) => {
            return new Promise((resolveDelete, rejectDelete) => {
              fs.unlink(path, err => {
                if (err) {
                  logger.error(`Error deleting ${file}: ${err.message}`);
                  rejectDelete(err);
                } else {
                  logger.info(`Deleted old backup: ${file}`);
                  resolveDelete();
                }
              });
            });
          });
          
          Promise.allSettled(deletePromises)
            .then(() => resolve())
            .catch(err => reject(err));
        } else {
          logger.info(`Found ${sqlFiles.length} backups, no cleanup needed (max: ${MAX_BACKUPS})`);
          resolve();
        }
      } catch (error) {
        logger.error("Error during cleanup processing:", error);
        reject(error);
      }
    });
  });
}


function restoreDBFromBackup(backupFile) {
  return new Promise((resolve, reject) => {
    if (!backupFile) {
      reject(new Error("No backup file specified"));
      return;
    }
    
    let command;
    
    if (IS_PRODUCTION) {
      // For production (inside container)
      command = `sudo docker exec -t ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -f ${backupFile}`;
    }
    
    logger.info(`Restoring database from ${backupFile}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.error("Error restoring database:", error.message);
        reject(error);
        return;
      }
      
      // psql often outputs information to stderr that isn't actually an error
      if (stderr) {
        logger.info("Restore output:", stderr);
      }
      
      logger.info("Database restored successfully");
      resolve(true);
    });
  });
}


function listAvailableBackups() {
  return new Promise((resolve, reject) => {
    const backupDirPath = BACKUP_DIR;
    
    fs.readdir(backupDirPath, (err, files) => {
      if (err) {
        logger.error("Error reading backup directory: ", err.message);
        reject(err);
        return;
      }
      
      try {
        const backups = files
          .filter(file => file.endsWith(".sql") && file.startsWith("backup_"))
          .map(file => {
            const stats = fs.statSync(path.join(backupDirPath, file));
            return {
              file,
              path: path.join(backupDirPath, file),
              size: (stats.size / (1024 * 1024)).toFixed(2) + " MB",
              created: new Date(stats.birthtimeMs || stats.mtimeMs).toISOString(),
              timestamp: stats.birthtimeMs || stats.mtimeMs
            };
          })
          .sort((a, b) => b.timestamp - a.timestamp); // Newest first
          
        resolve(backups);
      } catch (error) {
        logger.error("Error processing backups:", error);
        reject(error);
      }
    });
  });
}

module.exports = { 
  createDBBackup,
  cleanOldBackups,
  restoreDBFromBackup,
  listAvailableBackups
};