import * as dotenv from "dotenv";
dotenv.config();
import { spawn, SpawnOptionsWithoutStdio } from "child_process";
import fs from "fs";
import path from "path";
import logger from "./logger";

const dbHost = 'taskminder-postgres';
const dbPort = '5432';
const DB_USER = process.env.DB_USER;
const DB_NAME = process.env.DB_NAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const BACKUP_DIR = "/backups";
const MAX_BACKUPS = 48;
const IS_PRODUCTION = process.env.NODE_ENV === "PRODUCTION";

function runSpawn(command: string, args: string[], logPrefix: string, options?: SpawnOptionsWithoutStdio): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        const spawnOptions: SpawnOptionsWithoutStdio = {
            shell: false,
            ...options,
            env: {
                ...(globalThis.process?.env || {}),
                ...(options?.env || {}),
            }
        };


        const process = spawn(command, args, spawnOptions);

        let stdoutData = '';
        let stderrData = '';

        process.stdout?.on('data', (data) => {
            const strData = data.toString();
            stdoutData += strData;
        });

        process.stderr?.on('data', (data) => {
            const strData = data.toString();
            stderrData += strData;
             logger.info(`${logPrefix} stderr: ${strData.trim()}`);
        });

        process.on('error', (error) => {
            logger.error(`${logPrefix}: Spawn error: ${error.message}`);
            reject(error);
        });

        process.on('close', (code) => {
            if (code !== 0) {
                const errorMsg = `${logPrefix}: Process exited with non-zero code ${code}. Stderr: ${stderrData || 'N/A'}. Stdout: ${stdoutData || 'N/A'}`;
                logger.error(errorMsg);
                reject(new Error(errorMsg));
            } else {
                 if (stderrData) {
                    logger.info(`${logPrefix}: Process stderr on success: ${stderrData.trim()}`);
                 }
                resolve({ stdout: stdoutData, stderr: stderrData });
            }
        });
    });
}

export function createDBBackup(): Promise<string | null> {
    return new Promise((resolve, reject) => {
        if (!IS_PRODUCTION) {
            logger.info("Skipping backup - not in production environment");
            resolve(null);
            return;
        }

        if (!DB_PASSWORD || !DB_USER || !DB_NAME) {
             logger.error("Backup failed: Missing required environment variables (DB_PASSWORD, DB_USER, DB_NAME)");
             return reject(new Error("Missing required environment variables for backup"));
        }

        try {
            if (!fs.existsSync(BACKUP_DIR)) {
                logger.info(`Backup directory ${BACKUP_DIR} does not exist. Creating...`);
                fs.mkdirSync(BACKUP_DIR, { recursive: true });
            }
        } catch (dirErr: any) {
             logger.error(`Failed to create backup directory ${BACKUP_DIR}: ${dirErr.message}`);
             return reject(new Error(`Failed to ensure backup directory exists: ${dirErr.message}`));
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupFileName = `backup_${timestamp}.sql`;
        const finalBackupFilePath = path.join(BACKUP_DIR, backupFileName);

        logger.info(`Creating backup: Running pg_dump directly`);
        logger.info(`Backup file will be saved to: ${finalBackupFilePath}`);

        const pgDumpCommand = 'pg_dump';
        const pgDumpArgs = [
          '-h', dbHost,
          '-p', dbPort,
          '-U', DB_USER,
          '-d', DB_NAME,
          '-f', finalBackupFilePath,
          '--no-password', 
          '--format=custom',
          '--blobs' 
        ];

        const spawnOptions: SpawnOptionsWithoutStdio = {
            env: { PGPASSWORD: DB_PASSWORD }
        };

        runSpawn(pgDumpCommand, pgDumpArgs, '[Backup pg_dump]', spawnOptions)
            .then(({ stderr }) => {
                logger.info(`pg_dump process completed. Output file: ${finalBackupFilePath}`);
                 if (stderr && !/dump complete/.test(stderr.toLowerCase())) {
                     logger.warn(`pg_dump stderr might indicate non-critical issues: ${stderr.trim()}`);
                 }
                return cleanOldBackups();
            })
            .then(() => resolve(finalBackupFilePath))
            .catch(err => {
                logger.error("Error during backup process:", err.message);
                 if (fs.existsSync(finalBackupFilePath)) {
                    logger.info(`Attempting to clean up potentially incomplete backup file: ${finalBackupFilePath}`);
                    fs.unlink(finalBackupFilePath, (unlinkErr) => {
                        if (unlinkErr) {
                            logger.warn(`Failed to delete incomplete backup file ${finalBackupFilePath}: ${unlinkErr.message}`);
                        } else {
                            logger.info(`Deleted incomplete backup file: ${finalBackupFilePath}`);
                        }
                    });
                 }
                reject(err);
            });
    });
}

export function cleanOldBackups(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (!IS_PRODUCTION) {
            logger.info("Skipping cleanup - not in production environment");
            resolve();
            return;
        }

        const backupDirPath = BACKUP_DIR;
        logger.info(`Cleaning old backups in ${backupDirPath}, keeping ${MAX_BACKUPS} most recent`);

        fs.readdir(backupDirPath, (err, files) => {
            if (err) {
                if (err.code === 'ENOENT') {
                     logger.warn(`Backup directory ${backupDirPath} not found. Skipping cleanup.`);
                     resolve();
                     return;
                }
                logger.error(`Error reading backup directory ${backupDirPath}: ${err.message}`);
                reject(err);
                return;
            }

            try {
                const sqlFiles = files
                    .filter(file => (file.endsWith(".sql") || file.endsWith(".backup")) && file.startsWith("backup_"))
                    .map(file => {
                        const filePath = path.join(backupDirPath, file);
                        try {
                            const stats = fs.statSync(filePath);
                            const time = stats.birthtimeMs || stats.mtimeMs;
                            return { file, path: filePath, time };
                        } catch (statErr: any) {
                             logger.warn(`Could not stat file ${filePath} during cleanup: ${statErr.message}. Skipping.`);
                             return null;
                        }
                    })
                    .filter((f): f is { file: string; path: string; time: number } => f !== null)
                    .sort((a, b) => a.time - b.time);
                if (sqlFiles.length > MAX_BACKUPS) {
                    const filesToDelete = sqlFiles.slice(0, sqlFiles.length - MAX_BACKUPS);
                    logger.info(`Found ${sqlFiles.length} backups, deleting ${filesToDelete.length} oldest ones.`);

                    const deletePromises = filesToDelete.map(({ file, path: filePath }) => {
                        return fs.promises.unlink(filePath)
                            .then(() => {
                                logger.info(`Deleted old backup: ${file}`);
                                return { status: 'fulfilled', file };
                            })
                            .catch(unlinkErr => {
                                logger.error(`Error deleting old backup ${file}: ${unlinkErr.message}`);
                                return { status: 'rejected', file, reason: unlinkErr };
                            });
                    });

                    Promise.allSettled(deletePromises).then(() => {
                        resolve();
                    });

                } else {
                    logger.info(`Found ${sqlFiles.length} backups, no cleanup needed (max: ${MAX_BACKUPS}).`);
                    resolve();
                }
            } catch (processingError: unknown) {
                logger.error("Error during cleanup processing:", processingError);
                reject(processingError instanceof Error ? processingError : new Error(String(processingError)));
            }
        });
    });
}


export function restoreDBFromBackup(backupFilePathOnHost: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
        if (!backupFilePathOnHost) {
            return reject(new Error("No backup file specified"));
        }

        if (!IS_PRODUCTION) {
             logger.warn("Skipping restore - not in production environment");
             return reject(new Error("Restore skipped in non-production environment"));
        }

        if (!DB_PASSWORD || !DB_USER || !DB_NAME) {
             logger.error("Restore failed: Missing required environment variables (DB_PASSWORD, DB_USER, DB_NAME)");
             return reject(new Error("Missing required environment variables for restore"));
        }

        if (!fs.existsSync(backupFilePathOnHost)) {
            logger.error(`Restore failed: Backup file not found at ${backupFilePathOnHost} (inside taskminder container)`);
            return reject(new Error(`Backup file not found: ${backupFilePathOnHost}`));
        }

        logger.info(`Restoring database from ${backupFilePathOnHost}`);
        logger.info(`Executing pg_restore directly, connecting to ${dbHost}:${dbPort}`);

        const restoreCommand = 'pg_restore';
        const restoreArgs = [
          '-h', dbHost,
          '-p', dbPort,
          '-U', DB_USER,
          '-d', DB_NAME,
          '--no-password',
          '--clean', 
          '--if-exists', 
          '--exit-on-error',
          backupFilePathOnHost
        ];

        const spawnOptions: SpawnOptionsWithoutStdio = {
            env: { PGPASSWORD: DB_PASSWORD }
        };
        runSpawn(restoreCommand, restoreArgs, '[Restore pg_restore/psql]', spawnOptions)
            .then(({ stderr }) => {
                // Restore tools often write progress/status to stderr
                logger.info("Database restore command completed successfully.");
                if (stderr) {
                     logger.info(`Restore output (stderr): ${stderr.trim()}`);
                }
                resolve(true);
            })
            .catch(err => {
                 logger.error("Error during database restore process:", err.message);
                 reject(err);
            });
    });
}

interface FileData {
    file: string;
    path: string;
    size: string;
    created: string;
    timestamp: number;
}

export function listAvailableBackups(): Promise<FileData[]> {
     return new Promise<FileData[]>((resolve, reject) => {
        const backupDirPath = BACKUP_DIR;
        logger.info(`Listing backups in directory: ${backupDirPath}`);

        fs.readdir(backupDirPath, (err, files) => {
            if (err) {
                if (err.code === 'ENOENT') {
                     logger.warn(`Backup directory ${backupDirPath} not found. Returning empty list.`);
                     resolve([]);
                     return;
                }
                logger.error(`Error reading backup directory ${backupDirPath}: ${err.message}`);
                reject(err);
                return;
            }

            try {
                const backups: FileData[] = files
                    .filter(file => (file.endsWith(".sql") || file.endsWith(".backup")) && file.startsWith("backup_"))
                    .map((file) => {
                        const filePath = path.join(backupDirPath, file);
                         try {
                            const stats = fs.statSync(filePath);
                            const timestamp = stats.birthtimeMs || stats.mtimeMs;
                            return {
                                file,
                                path: filePath,
                                size: (stats.size / (1024 * 1024)).toFixed(2) + " MB",
                                created: new Date(timestamp).toISOString(),
                                timestamp: timestamp
                            };
                        } catch (statErr: any) {
                             logger.warn(`Could not stat file ${filePath} during list: ${statErr.message}. Skipping file.`);
                             return null;
                        }
                    })
                     .filter((backup): backup is FileData => backup !== null)
                    .sort((a, b) => b.timestamp - a.timestamp);

                logger.info(`Found ${backups.length} backup files.`);
                resolve(backups);
            } catch (processingError: unknown) {
                logger.error("Error processing backup list:", processingError);
                 reject(processingError instanceof Error ? processingError : new Error(String(processingError)));
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