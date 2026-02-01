import prisma from "../config/prisma";
import logger from "../config/logger";
import { encryptionManager } from "./encryption.manager";

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

  let updated = 0;
  for (const classEntry of classes) {
    const plaintext = encryptionManager.decrypt(classEntry.classCode);
    const reEncrypted = encryptionManager.encrypt(plaintext);
    const classCodeHash = encryptionManager.hash(plaintext);

    if (
      classEntry.classCode === reEncrypted &&
      classEntry.classCodeHash === classCodeHash
    ) {
      continue;
    }

    await prisma.class.update({
      where: { classId: classEntry.classId },
      data: {
        classCode: reEncrypted,
        classCodeHash: classCodeHash
      }
    });
    updated += 1;
  }

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
