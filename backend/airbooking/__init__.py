# This makes the Celery app importable whenever Django starts.
from .celery import app as celery_app

__all__ = ("celery_app",)
