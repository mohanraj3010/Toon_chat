# ==============================================================================
# Stage 1: Build virtual environment with wheels and compilation dependencies
# ==============================================================================
FROM python:3.11-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ==============================================================================
# Stage 2: Final minimal production runtime
# ==============================================================================
FROM python:3.11-slim AS runner

WORKDIR /app

# Install minimal runtime dependencies (libpq for asyncpg/psycopg2, curl for healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create secure non-root user
RUN groupadd -g 10001 toonchat && \
    useradd -u 10001 -g toonchat -s /bin/sh -m toonchat

# Copy pre-built virtual environment from builder
COPY --from=builder --chown=toonchat:toonchat /opt/venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    ENVIRONMENT=production \
    LOG_FORMAT=json

# Copy application code and migration files
COPY --chown=toonchat:toonchat alembic.ini gunicorn_conf.py ./
COPY --chown=toonchat:toonchat alembic/ ./alembic/
COPY --chown=toonchat:toonchat app/ ./app/
COPY --chown=toonchat:toonchat scripts/entrypoint.sh ./scripts/entrypoint.sh

RUN chmod +x ./scripts/entrypoint.sh && \
    mkdir -p data/storage && \
    chown -R toonchat:toonchat /app

USER toonchat

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://127.0.0.1:8000/health || exit 1

ENTRYPOINT ["./scripts/entrypoint.sh"]
CMD ["gunicorn", "-c", "gunicorn_conf.py", "app.main:app"]

