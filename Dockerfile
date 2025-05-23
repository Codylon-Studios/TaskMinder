ARG NODE_VERSION=20.19.1

FROM node:${NODE_VERSION}-alpine

# Update alpine packages
RUN apk update && apk upgrade --no-cache && \
    apk add --no-cache \
    build-base \
    postgresql-client \
    py3-pip \
    python3 \
    redis && \
    python3 -m venv /venv && \
    . /venv/bin/activate && \
    pip install --upgrade pip && \
    pip install mkdocs-material

# Make venv default for mkdocs
ENV PATH="/venv/bin:$PATH"

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
    npm run build:be && \
    npm run build:fe && \
    npm run build:docs && \
    chown -R node:node /usr/src/app

# Switch to node user for runtime
USER node

# Expose application port
EXPOSE 3000
