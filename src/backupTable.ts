import { exec } from "child_process";
import fs from "fs";
import path from "path";
import logger from "./logger";
import * as dotenv from "dotenv";
dotenv.config()

const DB_USER = process.env.DB_USER;
const DB_NAME = process.env.DB_NAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const CONTAINER_NAME = "taskminder-postgres";
const BACKUP_DIR = "/backups";
const MAX_BACKUPS = 48;
const IS_PRODUCTION = process.env.NODE_ENV === "PRODUCTION";

export function createDBBackup() {
  return new Promise((resolve, reject) => {
    if (!IS_PRODUCTION) {
      logger.info("Skipping backup - not in production environment");
      resolve(null);
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFileName = `backup_${timestamp}.sql`;
    const backupFile = `/backups/${backupFileName}`;
    const command = `docker exec ${CONTAINER_NAME} bash -c "PGPASSWORD='${DB_PASSWORD}' pg_dump -U ${DB_USER} -d ${DB_NAME} -f ${backupFile}"`;

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

export function cleanOldBackups() {
  return new Promise<void | Error>((resolve, reject) => {
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
            return new Promise<void | Error>((resolveDelete, rejectDelete) => {
              fs.unlink(path, err => {
                if (err) {
                  if (err instanceof Error) {
                    logger.error(`Error deleting ${file}: ${err.message}`);
                    rejectDelete(err);
                  } else {
                    reject(new Error("Unknown error during cleanup processing"));
                  }
                } else {
                  logger.info(`Deleted old backup: ${file}`);
                  resolveDelete();
                }
              });
            });
          });
          
          Promise.allSettled(deletePromises)
            .then(() => resolve())
            .catch((err: Error) => reject(err));
        } else {
          logger.info(`Found ${sqlFiles.length} backups, no cleanup needed (max: ${MAX_BACKUPS})`);
          resolve();
        }
      } catch (error: unknown) {
        logger.error("Error during cleanup processing:", error);
        if (error instanceof Error) {
          reject(error);
        } else {
          reject(new Error("Unknown error during cleanup processing"));
        }
      }
    });
  });
}


export function restoreDBFromBackup(backupFile: string) {
  return new Promise((resolve, reject) => {
    if (!backupFile) {
      reject(new Error("No backup file specified"));
      return;
    }
    
    let command = "";
    
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

interface FileData {
  file: string;
  path: string;
  size: string;
  created: string;
  timestamp: any;
}

export function listAvailableBackups() {
  return new Promise<void | Error | FileData[]>((resolve, reject) => {
    const backupDirPath = BACKUP_DIR;
    
    fs.readdir(backupDirPath, (err, files) => {
      if (err) {
        if (err instanceof Error) {
          logger.error("Error reading backup directory: ", err.message);
          reject(err);
        } else {
          reject(new Error("Unknown error during listing backups"));
        }
        return;
      }
      
      try {
        const backups = files
          .filter(file => file.endsWith(".sql") && file.startsWith("backup_"))
          .map((file) => {
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
        if (error instanceof Error) {
          logger.error("Error processing backups:", error);
          reject(error);
        } else {
          reject(new Error("Unknown error during listing backups"));
        }
      }
    });
  });
}

export default { 
  createDBBackup,
  cleanOldBackups,
  restoreDBFromBackup,
  listAvailableBackups
};
