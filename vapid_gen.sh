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

# Generate EC private key (needed as an intermediate step)
# This outputs a PEM file containing both private and public key info.
openssl ecparam -name prime256v1 -genkey -noout -out "$SECRETS_DIR/vapidkey-private.pem"

# Define function for URL-safe base64 encoding with padding removed
base64url() {
  openssl base64 -A | tr '+/' '-_' | tr -d '='
}

# --- Generate Public Key (65-byte raw uncompressed + base64url) ---

# Convert the public key part to DER format (approx 91 bytes for uncompressed P-256 SPKI).
# The raw 65-byte uncompressed point starts at byte offset 26 within this DER blob
# (after ASN.1 headers, OIDs, BIT STRING tag/length, and unused bits byte).
# Use dd to skip the header and extract exactly 65 bytes.
# Pipe this raw 65 bytes to base64url function.
# NOTE: The 'skip=26' offset relies on the standard P-256 SEC1 DER structure for SubjectPublicKeyInfo.
echo "Extracting raw public key bytes..."
openssl ec -in "$SECRETS_DIR/vapidkey-private.pem" -pubout -outform DER | dd bs=1 skip=26 count=65 2>/dev/null | base64url > "$PUB_KEY_FILE"

# Validate the public key raw uncompressed length (should be 65 bytes)
decoded_pub_len=$(openssl ec -in "$SECRETS_DIR/vapidkey-private.pem" -pubout -outform DER | dd bs=1 skip=26 count=65 2>/dev/null | wc -c)
if [[ $decoded_pub_len -ne 65 ]]; then
  echo "Error: Failed to extract 65-byte raw public key."
  echo "  Expected 65 bytes, got $decoded_pub_len."
  echo "  This might indicate an issue with OpenSSL version/output format or the 'skip' offset (expected 26)."
  rm "$SECRETS_DIR"/vapidkey-*.pem # Clean up before exiting
  exit 1
else
  echo "Public key raw uncompressed length check: OK (65 bytes)"
fi


# --- Generate Private Key (32-byte raw scalar + base64url) ---

# Convert the private key to SEC1 DER format (approx 118 bytes for P-256 SEC1 ECPrivateKey).
# The raw 32-byte scalar is embedded within an OCTET STRING.
# For P-256 SEC1, the OCTET STRING containing the scalar starts at byte offset 5,
# and its header (tag+length) is 2 bytes. The raw scalar starts at offset 5 + 2 = 7.
# Use dd to skip the header and extract exactly 32 bytes.
# Pipe this raw 32 bytes to base64url function.
# NOTE: The 'skip=7' offset relies on the standard P-256 SEC1 DER structure for ECPrivateKey.
echo "Extracting raw private key bytes..."
openssl ec -in "$SECRETS_DIR/vapidkey-private.pem" -outform DER | dd bs=1 skip=7 count=32 2>/dev/null | base64url > "$PRIV_KEY_FILE"

# Validate the private key raw scalar length (should be 32 bytes)
# We re-perform the dd extraction to check the length
decoded_priv_len=$(openssl ec -in "$SECRETS_DIR/vapidkey-private.pem" -outform DER | dd bs=1 skip=7 count=32 2>/dev/null | wc -c)
if [[ $decoded_priv_len -ne 32 ]]; then
  echo "Error: Failed to extract 32-byte raw private scalar."
  echo "  Expected 32 bytes, got $decoded_priv_len."
  echo "  This might indicate an issue with OpenSSL version/output format or the 'skip' offset (expected 7)."
  rm "$SECRETS_DIR"/vapidkey-*.pem # Clean up before exiting
  exit 1
else
  echo "Private key raw scalar length check: OK (32 bytes)"
fi


# Clean up temporary PEM file
rm "$SECRETS_DIR/vapidkey-private.pem" # Only the private PEM is needed for both keys

echo "VAPID keys generated in raw format (65-byte public, 32-byte private scalar), base64url encoded:"
echo "  Public Key:  $PUB_KEY_FILE"
echo "  Private Key: $PRIV_KEY_FILE"

exit 0 # Explicitly exit with success