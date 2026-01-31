# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base
WORKDIR /usr/src/app

# Install dependencies into temp directory
# This will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock* /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# Install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock* /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Copy source code
FROM base AS prerelease
COPY --from=install /temp/prod/node_modules node_modules
COPY . .
# Default to production; Fly [env] or secrets can override
ENV BUN_ENV=production
ENV NODE_ENV=production
# Build the application
RUN bun run build

# Start fresh from base image for the final image
FROM base AS release
WORKDIR /usr/src/app


# Copy built application
COPY --from=prerelease /usr/src/app/dist dist
COPY --from=prerelease /usr/src/app/node_modules node_modules
COPY --from=prerelease /usr/src/app/package.json .

# Ensure proper permissions
RUN chown -R bun:bun /usr/src/app

# The bun user already exists in the official image, so we can use it directly
USER bun

# Expose the port
EXPOSE 3000

# Start the application (no entrypoint so BUN_ENV is passed through)
# ENTRYPOINT []
CMD ["bun", "dist/index.js"]