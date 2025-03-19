const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const logger = require('../logger');
require("dotenv").config();

const DB_USER = process.env.DB_USER;
const DB_NAME = process.env.DB_NAME;
const CONTAINER_NAME = process.env.DB_CONTAINER;
const BACKUP_DIR = process.env.BACKUP_DIR;
const MAX_BACKUPS = 48;

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Generate a timestamped filename
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupFile = path.join(BACKUP_DIR, `backup_${timestamp}.sql`);

// Create the backup
const command = `sudo docker exec -t ${CONTAINER_NAME} pg_dump -U ${DB_USER} -d ${DB_NAME} | tee ${backupFile}`;

exec(command, (error, stdout, stderr) => {
    if (error) {
        logger.error("Error creating backup:", error.message);
        return;
    }
    if (stderr) {
        logger.error("stderr: ", stderr);
        return;
    }
    logger.info("Backup saved as ", backupFile);

    // Delete old backups if more than MAX_BACKUPS
    cleanOldBackups();
});

// Function to clean up old backups
function cleanOldBackups() {
    fs.readdir(BACKUP_DIR, (err, files) => {
        if (err) {
            logger.error("Error reading backup directory: ", err.message);
            return;
        }

        // Filter only .sql files and sort by creation time (oldest first)
        const sqlFiles = files
            .filter(file => file.endsWith(".sql"))
            .map(file => ({
                file,
                time: fs.statSync(path.join(BACKUP_DIR, file)).birthtimeMs
            }))
            .sort((a, b) => a.time - b.time);

        // If we have more backups than allowed, delete the oldest ones
        if (sqlFiles.length > MAX_BACKUPS) {
            const filesToDelete = sqlFiles.slice(0, sqlFiles.length - MAX_BACKUPS);
            filesToDelete.forEach(({ file }) => {
                const filePath = path.join(BACKUP_DIR, file);
                fs.unlink(filePath, err => {
                    if (err) {
                        logger.error("Error deleting ", file, ": ", err.message);
                    } else {
                        logger.info("Deleted old backup: ", file);
                    }
                });
            });
        }
    });
}
