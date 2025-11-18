# ==============================================================================
# ---------- Build Stage ----------
# ==============================================================================
FROM oven/bun:1.3-alpine AS builder
WORKDIR /usr/src/app
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun bun install
COPY . .
RUN bunx prisma generate && bun run build
RUN bun install --production

# ==============================================================================
# ---------- Production Stage ----------
# ==============================================================================
FROM oven/bun:1.3-alpine AS production

# Install only RUNTIME system dependencies
RUN apk update && apk upgrade --no-cache && \
  apk add --no-cache \
  clamav \
  clamav-daemon \
  clamav-libunrar \
  redis \
  ghostscript \
  su-exec

# Create app & ClamAV directories with proper permissions
RUN mkdir -p /var/lib/clamav /run/clamav /var/lib/clamav/tmp && \
  chown -R clamav:clamav /var/lib/clamav /run/clamav && \
  chmod -R 775 /var/lib/clamav /run/clamav

WORKDIR /usr/src/app

# Copy production artifacts from the builder stage
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/backend/src/prisma ./backend/src/prisma
COPY --from=builder /usr/src/app/backend/dist ./backend/dist
COPY --from=builder /usr/src/app/frontend/dist ./frontend/dist
COPY --from=builder /usr/src/app/copyFiles.js ./copyFiles.js
COPY --from=builder /usr/src/app/prisma.config.ts ./prisma.config.ts

# ---- Add and configure the entrypoint script ----
COPY entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/entrypoint.sh

# Set ownership for the app user and create directories for uploads
RUN mkdir -p /usr/src/app/data/temp \
    /usr/src/app/data/uploads \
    /usr/src/app/data/quarantine \
    /usr/src/app/data/sanitized \
 && chown -R bun:bun /usr/src/app/data

EXPOSE 3000

# Set the entrypoint to script
ENTRYPOINT ["entrypoint.sh"]

# Set the default command to be executed by the entrypoint
CMD ["bun", "backend/dist/server.js"]