import os

from celery import Celery

# Point Django at the settings module before reading any settings.
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "airbooking.settings")

app = Celery("airbooking")

# Read every CELERY_* option from Django settings.
app.config_from_object("django.conf:settings", namespace="CELERY")

# Look for tasks inside each installed app.
app.autodiscover_tasks()
