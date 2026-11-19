from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Every visitor who registers starts as 'pending' until an admin approves."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

    STATUS_CHOICES = [
        (PENDING, "Pending"),
        (APPROVED, "Approved"),
        (REJECTED, "Rejected"),
    ]

    email = models.EmailField(unique=True)
    approval_status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=PENDING,
    )
    phone = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.username} ({self.approval_status})"

    @property
    def is_approved(self):
        return self.approval_status == self.APPROVED
