# ── backend/Dockerfile ──
FROM node:20-alpine

# Create app dir
WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Create uploads directory
RUN mkdir -p uploads

# Non-root user for security
RUN addgroup -S svgroup && adduser -S svuser -G svgroup
RUN chown -R svuser:svgroup /app
USER svuser

EXPOSE 4000
CMD ["node", "server.js"]
