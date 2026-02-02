import * as dotenv from "dotenv";
dotenv.config();
import prisma from "../config/prisma";
import logger from "../config/logger";
import { encryptionManager } from "./encryption.manager";

async function migrateClassCodes(): Promise<void> {
  const classes = await prisma.class.findMany({
    select: {
      classId: true,
      classCode: true,
      classCodeHash: true
    }
  });

  const updated = await prisma.$transaction(async tx => {
    let updatedCount = 0;
    for (const classEntry of classes) {
      let plaintext = classEntry.classCode;
      if (encryptionManager.isEncrypted(classEntry.classCode)) {
        plaintext = encryptionManager.decrypt(classEntry.classCode);
      }

      const encryptedCode = encryptionManager.encrypt(plaintext);
      const classCodeHash = encryptionManager.hash(plaintext);
      if (
        encryptionManager.isEncrypted(classEntry.classCode) &&
        classEntry.classCodeHash === classCodeHash
      ) {
        continue;
      }
      await tx.class.update({
        where: { classId: classEntry.classId },
        data: {
          classCode: encryptedCode,
          classCodeHash: classCodeHash
        }
      });
      updatedCount += 1;
    }
    return updatedCount;
  });

  logger.info(`Class code migration complete. Updated ${updated} records.`);
}

migrateClassCodes()
  .catch(error => {
    logger.error(`Failed to migrate class codes: ${error}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
