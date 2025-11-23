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
