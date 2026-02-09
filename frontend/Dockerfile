# Multi-stage build for React frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Build argument for API URL (Railway passes env vars as build args)
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Debug: print the API URL during build
RUN echo "=== VITE_API_URL is: $VITE_API_URL ==="

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and build (VITE_API_URL is available during build)
COPY . .
RUN npm run build

# Production stage with nginx
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Default port (Railway overrides with PORT env var)
ENV PORT=80

EXPOSE 80

# Use envsubst to substitute PORT at runtime, then start nginx
CMD sh -c "envsubst '\$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
