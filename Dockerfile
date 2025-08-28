# Use the official Bun image
FROM oven/bun:1 as base
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

# Build the application
RUN bun run build

# Start fresh from base image for the final image
FROM base AS release
WORKDIR /usr/src/app

# Copy built application
COPY --from=prerelease /usr/src/app/dist dist
COPY --from=prerelease /usr/src/app/node_modules node_modules
COPY --from=prerelease /usr/src/app/package.json .

# The bun user already exists in the official image, so we can use it directly
USER bun

# Expose the port
EXPOSE 3000

# Start the application
CMD ["bun", "run", "dist/index.js"]
