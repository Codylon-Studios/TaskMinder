# Use official Bun image
FROM oven/bun:1.2-alpine

# Update Alpine packages and install system dependencies
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache \
    build-base \
    postgresql-client \
    redis

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY bun.lock ./
COPY package.json ./

# Install production dependencies with caching
RUN --mount=type=cache,target=/root/.bun \
    bun install --production

# Copy source files
COPY . .

# Prisma and build steps
RUN bunx prisma generate && \
    bun run build && \
    chown -R bun:bun /usr/src/app

# Switch to bun user for runtime (Bun's base image uses `bun` user)
USER bun

# Expose application port
EXPOSE 3000
