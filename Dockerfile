# syntax = docker/dockerfile:1.4
# ==================== Development Stage ====================
FROM node:22-alpine AS development

LABEL maintainer="GAAP Team <dev@gaap.cc>"
LABEL description="GAAP Web Development Environment with Hot-Reload"

WORKDIR /app

# Install dependencies for sharp (image optimization)
RUN apk add --no-cache libc6-compat

# Copy package files for dependency caching
COPY package*.json ./
# Install nodemon globally for file watching in Docker
RUN npm install -g nodemon
RUN --mount=type=cache,target=/root/.npm npm ci

# Copy source code
COPY . .

# Expose Next.js dev port
EXPOSE 3000

# Run development server
# USE_NODEMON=true: use nodemon for Windows Docker (polling)
# USE_NODEMON=false/unset: use native HMR for macOS/Linux
CMD ["sh", "-c", "if [ \"$USE_NODEMON\" = \"true\" ]; then npm run dev:docker; else npm run dev; fi"]

# ==================== Dependencies Stage ====================
FROM node:22-alpine AS dependencies

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --only=production

# ==================== Builder Stage ====================
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache libc6-compat

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

# Build Next.js for production
ENV NEXT_TELEMETRY_DISABLED=1
RUN --mount=type=cache,target=/app/.next/cache npm run build

# ==================== Production Runtime ====================
FROM node:22-alpine AS production

WORKDIR /app

RUN apk add --no-cache libc6-compat

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
  adduser -u 1001 -S nextjs -G nodejs

# Copy built assets and dependencies
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server.js"]
