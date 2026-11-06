import multiprocessing
import os

# Worker Configuration
# In containerized environments, workers are constrained by container RAM and CPU quotas.
default_workers = max(2, min(4, multiprocessing.cpu_count()))
workers = int(os.environ.get("WEB_CONCURRENCY", os.environ.get("WORKERS", default_workers)))
worker_class = "uvicorn.workers.UvicornWorker"

# Networking
bind = os.environ.get("BIND", f"0.0.0.0:{os.environ.get('PORT', '8000')}")
backlog = 2048

# Timeouts & Keepalive
# Keepalive is set to 65s to comfortably exceed Cloudflare (100s) / AWS ALB (60s) defaults
keepalive = int(os.environ.get("KEEPALIVE", 65))
timeout = int(os.environ.get("TIMEOUT", 120))
graceful_timeout = int(os.environ.get("GRACEFUL_TIMEOUT", 30))

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.environ.get("LOG_LEVEL", "info").lower()

# Process naming
proc_name = "toonchat-backend"

