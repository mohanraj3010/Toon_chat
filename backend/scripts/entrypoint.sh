#!/usr/bin/env sh
set -e

# Run database schema migrations if requested (standard for containerized deployments)
if [ "$RUN_MIGRATIONS" = "true" ] || [ "$RUN_MIGRATIONS" = "1" ]; then
  echo "[entrypoint] Running database migrations via Alembic..."
  alembic upgrade head
  echo "[entrypoint] Migrations complete."
fi

# Execute main process (gunicorn / uvicorn / custom command)
exec "$@"

