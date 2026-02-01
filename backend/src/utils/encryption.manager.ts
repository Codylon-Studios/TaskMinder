import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes
} from "crypto";

const ENCRYPTION_PREFIX = "enc:v1:";
const HKDF_SALT = Buffer.alloc(0);

const deriveKey = (masterKey: Buffer, info: string): Buffer =>
  Buffer.from(hkdfSync("sha256", masterKey, HKDF_SALT, Buffer.from(info), 32));

const deriveLookupHash = (lookupKey: Buffer, plaintext: string): string =>
  createHmac("sha256", lookupKey)
    .update(plaintext, "utf8")
    .digest("base64");

const parseBase64Key = (keyValue: string, envName: string): Buffer => {
  const key = Buffer.from(keyValue, "base64");
  if (key.length !== 32) {
    throw new Error(`${envName} must be 32 bytes (base64).`);
  }
  return key;
};

export class EncryptionManager {
  private readonly primaryEncKey: Buffer;
  private readonly lookupKey: Buffer;
  private readonly decryptKeys: Buffer[];

  private constructor(primaryKey: Buffer, secondaryKeys: Buffer[]) {
    this.primaryEncKey = deriveKey(primaryKey, "taskminder:enc");
    this.lookupKey = deriveKey(primaryKey, "taskminder:lookup");
    this.decryptKeys = [
      this.primaryEncKey,
      ...secondaryKeys.map(key => deriveKey(key, "taskminder:enc"))
    ];
  }

  static fromEnv(): EncryptionManager {
    const primaryKeyValue = process.env.ENCRYPTION_KEY;
    if (!primaryKeyValue) {
      throw new Error("ENCRYPTION_KEY is required.");
    }

    const secondaryKeyValue = process.env.ENCRYPTION_KEY_SECONDARY;
    const primaryKey = parseBase64Key(primaryKeyValue, "ENCRYPTION_KEY");
    const secondaryKeys = secondaryKeyValue
      ? [parseBase64Key(secondaryKeyValue, "ENCRYPTION_KEY_SECONDARY")]
      : [];

    return new EncryptionManager(primaryKey, secondaryKeys);
  }

  isEncrypted(value: string): boolean {
    return value.startsWith(ENCRYPTION_PREFIX);
  }

  hash(plaintext: string): string {
    return deriveLookupHash(this.lookupKey, plaintext);
  }

  encrypt(plaintext: string): string {
    if (this.isEncrypted(plaintext)) {
      return plaintext;
    }

    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.primaryEncKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final()
    ]);
    const tag = cipher.getAuthTag();

    return `${ENCRYPTION_PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
  }

  decrypt(payload: string): string {
    if (!this.isEncrypted(payload)) {
      return payload;
    }

    const parts = payload.split(":");
    if (parts.length !== 5) {
      throw new Error("Invalid encrypted payload format.");
    }

    const iv = Buffer.from(parts[2], "base64");
    const tag = Buffer.from(parts[3], "base64");
    const ciphertext = Buffer.from(parts[4], "base64");

    for (const key of this.decryptKeys) {
      try {
        const decipher = createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAuthTag(tag);
        const plaintext = Buffer.concat([
          decipher.update(ciphertext),
          decipher.final()
        ]);
        return plaintext.toString("utf8");
      }
      catch {
        continue;
      }
    }

    throw new Error("Unable to decrypt payload with available keys.");
  }
}

export const encryptionManager = EncryptionManager.fromEnv();
