ARG NODE_VERSION=20.19.1

FROM node:${NODE_VERSION}-alpine

# Update alpine packages
RUN apk update && apk upgrade --no-cache && \
# Install required packages: postgresql-client, redis, python3, py3-pip, and build tools
    apk add --no-cache \
    build-base \
    postgresql-client \
    py3-pip \
    python3 \
    redis && \
# Create a virtual environment and install mkdocs-material inside it
    python3 -m venv /venv && \
    . /venv/bin/activate && \
    pip install --upgrade pip && \
    pip install mkdocs-material

# Make venv default for mkdocs
ENV PATH="/venv/bin:$PATH"

WORKDIR /usr/src/app

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount to /root/.npm to speed up subsequent builds.
# Leverage a bind mounts to package.json and package-lock.json to avoid having to copy them into
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
  npm ci --omit=dev

# Copy the rest of the source files into the image.
COPY . .

RUN npm install -g typescript

# Start the container as node user
USER node


# Compile/Build everything needed for production
RUN npm run build:backend && npm run build:frontend && npm run build:docs

# Expose the port that the application listens on.
EXPOSE 3000
