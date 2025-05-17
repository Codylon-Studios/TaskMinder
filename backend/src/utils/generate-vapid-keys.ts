import webpush from 'web-push';
import * as fs from 'fs';
import * as path from 'path';

const SECRETS_DIR = './docker_secrets';
const PUB_KEY_FILE = path.join(SECRETS_DIR, 'vapid_public.txt');
const PRIV_KEY_FILE = path.join(SECRETS_DIR, 'vapid_private.txt');

function generateKeysIfNeeded() {
  // Check if keys already exist
  if (fs.existsSync(PUB_KEY_FILE) && fs.existsSync(PRIV_KEY_FILE)) {
    console.log('VAPID key files already exist, skipping generation.');
    process.exit(0);
  }

  console.log('Generating VAPID keys...');

  try {
    // Create the secrets directory if it doesn't exist
    fs.mkdirSync(SECRETS_DIR, { recursive: true });

    // Generate the keys using the web-push library
    const vapidKeys = webpush.generateVAPIDKeys();

    // Write the keys to files
    fs.writeFileSync(PUB_KEY_FILE, vapidKeys.publicKey, 'utf8');
    fs.writeFileSync(PRIV_KEY_FILE, vapidKeys.privateKey, 'utf8');

    console.log('VAPID keys generated:');
    console.log(`  Public Key:  ${PUB_KEY_FILE}`);
    console.log(`  Private Key: ${PRIV_KEY_FILE}`);
    process.exit(0);

  } catch (error) {
    console.error('Error generating VAPID keys:', error);
    // Clean up any partially created files on error
    if (fs.existsSync(PUB_KEY_FILE)) fs.unlinkSync(PUB_KEY_FILE);
    if (fs.existsSync(PRIV_KEY_FILE)) fs.unlinkSync(PRIV_KEY_FILE);
    process.exit(1);
  }
}

generateKeysIfNeeded();