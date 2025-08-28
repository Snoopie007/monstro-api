# Use the official Bun image
FROM oven/bun:1

# Set working directory inside the container
WORKDIR /app

# Copy dependency files first (better build caching)
COPY bun.lockb package.json ./

# Install production dependencies
RUN bun install --production

# Copy the rest of the app
COPY . .

# Expose Bun server port
EXPOSE 3000

# Start the Bun API server
CMD ["bun", "run", "start"]
