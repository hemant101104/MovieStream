## Multi-stage Dockerfile
# Builder: installs dev dependencies, builds the frontend
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source and build frontend
COPY . ./
RUN npm run build

# Runner: smaller image with only production dependencies
FROM node:18-alpine AS runner
WORKDIR /app

# Copy package files and install only production deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy built frontend and the server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server

# Ensure server data folder exists and copy initial data if present
COPY --from=builder /app/server/data ./server/data

ENV NODE_ENV=production
EXPOSE 3001

# Start the Node server
CMD ["node", "server/index.js"]
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies (omit dev dependencies)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Copy source
COPY . ./

# Build frontend
RUN npm run build

# Expose port and run server
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "server/index.js"]
