# ==============================================================================
# ---------- Build Stage ----------
# ==============================================================================
FROM oven/bun:1.2-alpine AS builder
WORKDIR /usr/src/app
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun bun install
COPY . .
RUN bunx prisma generate && bun run build
RUN bun install --production

# ==============================================================================
# ---------- Production Stage ----------
# ==============================================================================
FROM oven/bun:1.2-alpine AS production

# Install only RUNTIME system dependencies
RUN apk update && apk upgrade --no-cache && \
	apk add --no-cache \
	postgresql-client \
	redis

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

# Set ownership for the app user
RUN chown -R bun:bun /usr/src/app

# Switch to the non-root user
USER bun

EXPOSE 3000

# Set the entrypoint to script
ENTRYPOINT ["entrypoint.sh"]

# Set the default command to be executed by the entrypoint
CMD ["bun", "backend/dist/server.js"]