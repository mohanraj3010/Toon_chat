import contextvars
import json
import logging
import os
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional

# Context variable to hold request_id across async call chains
request_id_ctx: contextvars.ContextVar[str] = contextvars.ContextVar(
    "request_id", default="system"
)


class RequestIdFilter(logging.Filter):
    """Injects the current request_id into log records."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        return True


class JsonFormatter(logging.Formatter):
    """Outputs structured JSON lines for production log aggregators."""

    def format(self, record: logging.LogRecord) -> str:
        log_obj: Dict[str, Any] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "request_id": getattr(record, "request_id", "system"),
        }
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_obj)


def setup_logging(log_level: str = "INFO", log_format: Optional[str] = None) -> None:
    """Configures structured application logging."""
    logger = logging.getLogger()
    logger.setLevel(log_level.upper())

    is_json = (
        log_format == "json"
        or os.environ.get("LOG_FORMAT", "").lower() == "json"
        or os.environ.get("ENVIRONMENT") == "production"
    )

    formatter: logging.Formatter
    if is_json:
        formatter = JsonFormatter()
    else:
        formatter = logging.Formatter(
            fmt="[%(asctime)s] [%(levelname)s] [req_id:%(request_id)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )

    # Avoid duplicate handlers if setup is called multiple times
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(formatter)
        handler.addFilter(RequestIdFilter())
        logger.addHandler(handler)
    else:
        for handler in logger.handlers:
            handler.setFormatter(formatter)
            handler.addFilter(RequestIdFilter())


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
