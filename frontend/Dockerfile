# Multi-stage build for React frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Cache buster - change this value to force rebuild
ARG CACHEBUST=1

# Build argument for API URL (Railway passes env vars as build args)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Debug: print the API URL during build (remove after debugging)
RUN echo "=== CACHEBUST=$CACHEBUST VITE_API_URL=$VITE_API_URL ==="

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build (VITE_API_URL is available during build)
COPY . .
# Force cache invalidation - change this string to rebuild
RUN echo "FORCE_REBUILD_20260209_1850"
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Cache buster for nginx stage (must match builder to invalidate cache)
ARG CACHEBUST=1
RUN echo "nginx stage CACHEBUST=$CACHEBUST"

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Default port (Railway overrides with PORT env var)
ENV PORT=80

EXPOSE 80

# Use envsubst to substitute PORT at runtime, then start nginx
CMD sh -c "envsubst '\$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
