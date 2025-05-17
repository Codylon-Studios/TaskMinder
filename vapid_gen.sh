#!/bin/bash
set -e

SECRETS_DIR="./docker_secrets"
PUB_KEY_FILE="$SECRETS_DIR/vapid_public.txt"
PRIV_KEY_FILE="$SECRETS_DIR/vapid_private.txt"

mkdir -p "$SECRETS_DIR"

if [[ -f "$PUB_KEY_FILE" && -f "$PRIV_KEY_FILE" ]]; then
  echo "VAPID key files already exist, skipping generation."
  exit 0
fi

echo "Generating VAPID keys..."

# Generate EC private key
openssl ecparam -name prime256v1 -genkey -noout -out "$SECRETS_DIR/vapidkey-private.pem"

# Extract public key
openssl ec -in "$SECRETS_DIR/vapidkey-private.pem" -pubout -out "$SECRETS_DIR/vapidkey-public.pem"

# Convert PEM keys to base64 DER (binary) format, then base64 encode, then URL-safe replace
base64url() {
  openssl base64 -A | tr '+/' '-_' | tr -d '='
}

# Private key (in DER format) -> base64url
openssl ec -in "$SECRETS_DIR/vapidkey-private.pem" -outform DER | base64url > "$PRIV_KEY_FILE"

# Public key (in DER format) -> base64url
openssl ec -in "$SECRETS_DIR/vapidkey-public.pem" -pubin -outform DER | base64url > "$PUB_KEY_FILE"

# Clean up PEM files
rm "$SECRETS_DIR"/vapidkey-*.pem

echo "VAPID keys generated:"
echo "  Public Key:  $PUB_KEY_FILE"
echo "  Private Key: $PRIV_KEY_FILE"
