ARG NODE_VERSION=20.11.0

FROM node:${NODE_VERSION}-alpine

# Add psql client tools for backup DBs
RUN apk add --no-cache postgresql-client

WORKDIR /usr/src/app

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.npm to speed up subsequent builds.
# Leverage a bind mounts to package.json and package-lock.json to avoid having to copy them into
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
  npm ci --omit=dev

# Install redis-tools to be able to flush Redis cache
RUN apk add --no-cache redis

# Copy the rest of the source files into the image.
COPY . .

RUN npm install -g typescript

# Compile/Build everything needed for production -- TODO: add docs compiling through pip installment
RUN npm run build:backend && npm run build:frontend

# Expose the port that the application listens on.
EXPOSE 3000

# Run the compiled JavaScript file
CMD ["sh", "-c", "redis-cli -h redis FLUSHALL && node backend/dist/server.js"]
