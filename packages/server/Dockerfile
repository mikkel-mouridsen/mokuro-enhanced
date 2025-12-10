# Stage 1: Build the frontend (reader)
FROM node:20-alpine AS frontend-builder

WORKDIR /frontend

# Copy frontend package files
COPY reader/package*.json ./

# Install frontend dependencies (use install instead of ci to handle lock file sync issues)
RUN npm install

# Copy frontend source code
COPY reader/ ./

# Build the web version of the reader
RUN npm run build:web

# Verify the build output exists
RUN ls -la dist/web || echo "Build output not found!"

# Stage 2: Build the backend
FROM node:20-alpine AS backend-builder

WORKDIR /app

# Copy backend package files
COPY server/package*.json ./

# Install backend dependencies
RUN npm ci

# Copy backend source code
COPY server/ .

# Build TypeScript
RUN npm run build

# Stage 3: Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY server/package*.json ./
RUN npm ci --only=production

# Copy built backend from backend-builder
COPY --from=backend-builder /app/dist ./dist

# Copy built frontend from frontend-builder
COPY --from=frontend-builder /frontend/dist/web ./reader/dist/web

# Verify frontend files were copied
RUN echo "Checking frontend files..." && ls -la reader/dist/web || echo "Frontend files not found!"

# Expose port
EXPOSE 3000

# Start server
CMD ["npm", "run", "start:prod"]

