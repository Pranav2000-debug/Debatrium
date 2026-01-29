# Production Dockerfile - Backend Only
# Nginx runs on host, not in container
# 
# Build: docker build -t debatrium-backend .
# Run:   docker run -p 4000:4000 --env-file .env debatrium-backend
#
# For production with Redis:
#   docker-compose up -d

# ---------- BUILD STAGE ----------
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend source
COPY backend/ .

# ---------- RUNTIME STAGE ----------
FROM node:22-alpine AS runtime

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy only production dependencies and source
COPY --from=builder --chown=nodejs:nodejs /app ./

# Set environment defaults
ENV NODE_ENV=production
ENV PORT=4000

# Switch to non-root user
USER nodejs

# Expose backend port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start the backend
CMD ["node", "server.js"]