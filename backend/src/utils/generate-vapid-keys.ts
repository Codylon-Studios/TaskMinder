import webpush from 'web-push';
import fs from 'fs';

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);

const envPath = '.env';
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf-8');
}

function upsertEnvVariable(envStr: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(envStr)) {
    return envStr.replace(regex, `${key}=${value}`);
  } else {
    return envStr + `\n${key}=${value}`;
  }
}

envContent = upsertEnvVariable(envContent, 'VAPID_PUBLIC_KEY', vapidKeys.publicKey);
envContent = upsertEnvVariable(envContent, 'VAPID_PRIVATE_KEY', vapidKeys.privateKey);

fs.writeFileSync(envPath, envContent.trim() + '\n');