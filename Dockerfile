# Use the official Bun image
FROM oven/bun:1 as base

# Install Chrome dependencies and Chrome itself
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && sh -c 'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*


# Prevent Puppeteer from downloading Chrome during npm install
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Set the path to the installed Chrome
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome    

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
