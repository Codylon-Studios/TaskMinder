ARG NODE_VERSION=22.16.0

FROM node:${NODE_VERSION}-alpine

# Update alpine packages
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache \
    build-base \
    postgresql-client \
    redis

WORKDIR /usr/src/app

# Install production dependencies with caching
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev

# Copy all source code into the image
COPY . .

# Global TypeScript install and build steps
RUN npm install -g typescript && \
    npx prisma generate && \
    npm run build && \
    chown -R node:node /usr/src/app

# Switch to node user for runtime
USER node

# Expose application port
EXPOSE 3000
