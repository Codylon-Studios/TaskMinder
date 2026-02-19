import * as dotenv from "dotenv";
dotenv.config();
import prisma from "../config/prisma.js";
import logger from "../config/logger.js";
import { encryptionManager } from "./encryption.manager.js";

async function rotateClassCodeKeys(): Promise<void> {
  if (!process.env.ENCRYPTION_KEY_SECONDARY) {
    throw new Error("ENCRYPTION_KEY_SECONDARY must be set to rotate keys.");
  }

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
      let plaintext: string;
      let decryptedWithSecondary = false;
      try {
        plaintext = encryptionManager.decrypt(classEntry.classCode);
      }
      catch {
        plaintext = encryptionManager.decryptWithSecondary(classEntry.classCode);
        decryptedWithSecondary = true;
      }

      const classCodeHash = encryptionManager.hash(plaintext);

      if (!decryptedWithSecondary && classEntry.classCodeHash === classCodeHash) {
        continue;
      }

      const reEncrypted = encryptionManager.encrypt(plaintext);

      await tx.class.update({
        where: { classId: classEntry.classId },
        data: {
          classCode: reEncrypted,
          classCodeHash: classCodeHash
        }
      });
      updatedCount += 1;
    }
    return updatedCount;
  });

  logger.info(`Key rotation complete. Re-encrypted ${updated} records.`);
}

rotateClassCodeKeys()
  .catch(error => {
    logger.error(`Failed to rotate class code keys: ${error}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
