import * as dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import path from "path";
import logger from "./logger";
import zlib from "node:zlib";

const DB_HOST = process.env.DB_HOST;
const DB_PORT = '5432';
const DB_USER = process.env.DB_USER;
const DB_NAME = process.env.DB_NAME;
const DB_PASSWORD = process.env.DB_PASSWORD;
const BACKUP_DIR = "/backups";
const MAX_BACKUPS = 48;
const IS_PRODUCTION = process.env.NODE_ENV === "PRODUCTION";

interface FileData {
    file: string;
    path: string;
    size: string;
    created: string;
    timestamp: number;
}


export function createDBBackupStreaming(): Promise<string | null> {
    return new Promise((resolve, reject) => {
        if (!IS_PRODUCTION) {
            logger.info("Skipping backup - not in production environment");
            resolve(null);
            return;
        }
        
        if (!DB_PASSWORD || !DB_USER || !DB_NAME || !DB_HOST) {
             logger.error("Backup failed: Missing required environment variables");
             return reject(new Error("Missing required environment variables for backup"));
        }
        
        try {
            if (!fs.existsSync(BACKUP_DIR)) {
                fs.mkdirSync(BACKUP_DIR, { recursive: true });
            }
        } catch (dirErr: any) {
             return reject(new Error(`Failed to ensure backup directory exists: ${dirErr.message}`));
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const backupFileName = `backup_${timestamp}.sql.gz`;
        const finalBackupFilePath = path.join(BACKUP_DIR, backupFileName);
        
        logger.info(`Creating streaming compressed backup to: ${finalBackupFilePath}`);
        
        const pgDumpCommand = 'pg_dump';
        const pgDumpArgs = [
          '-h', DB_HOST,
          '-p', DB_PORT,
          '-U', DB_USER,
          '-d', DB_NAME,
          '--no-password', 
          '--format=plain',
          '--blobs'
        ];
        
        const { spawn } = require('child_process');
        const pgDump = spawn(pgDumpCommand, pgDumpArgs, {
            env: { ...process.env, PGPASSWORD: DB_PASSWORD }
        });
        
        const writeStream = fs.createWriteStream(finalBackupFilePath);
        const gzipStream = zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });
        
        pgDump.stdout.pipe(gzipStream).pipe(writeStream);
        
        let stderrData = '';
        pgDump.stderr.on('data', (data: Buffer) => {
            stderrData += data.toString();
        });
        
        pgDump.on('close', async (code: number | null) => {
            if (code !== 0) {
                logger.error(`pg_dump process exited with code ${code}: ${stderrData}`);
                if (fs.existsSync(finalBackupFilePath)) {
                    fs.unlinkSync(finalBackupFilePath);
                }
                return reject(new Error(`pg_dump failed with code ${code}`));
            }
            
            if (stderrData && !/dump complete/.test(stderrData.toLowerCase())) {
                logger.warn(`pg_dump stderr: ${stderrData.trim()}`);
            }
            
            const stats = fs.statSync(finalBackupFilePath);
            logger.info(`Streaming compressed backup completed. Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            
            try {
                await cleanOldBackups();
                resolve(finalBackupFilePath);
            } catch (cleanupErr) {
                logger.warn(`Backup created but cleanup failed: ${cleanupErr}`);
                resolve(finalBackupFilePath);
            }
        });
        
        pgDump.on('error', (err: Error) => {
            logger.error(`pg_dump process error: ${err.message}`);
            if (fs.existsSync(finalBackupFilePath)) {
                fs.unlinkSync(finalBackupFilePath);
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
                    .filter(file => (file.endsWith(".sql") || file.endsWith(".backup") || file.endsWith(".sql.gz")) && file.startsWith("backup_"))
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
                    .filter(file => (file.endsWith(".sql") || file.endsWith(".backup") || file.endsWith(".sql.gz")) && file.startsWith("backup_"))
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
    createDBBackupStreaming,
    cleanOldBackups,
    listAvailableBackups
};