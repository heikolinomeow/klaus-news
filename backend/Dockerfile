# Multi-stage build for Python FastAPI backend
FROM python:3.11-slim AS builder

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final stage
FROM python:3.11-slim

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY ./app ./app

# Make sure scripts in .local are usable
ENV PATH=/root/.local/bin:$PATH

# Expose port (Railway will override with PORT env var)
EXPOSE 8000

# Run the application using PORT env var (Railway sets this), fallback to 8000
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
