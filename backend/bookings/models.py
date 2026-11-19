import uuid

from django.conf import settings
from django.db import models

from flights.models import Flight


class Booking(models.Model):
    """A seat reservation made by one user for one flight."""

    PAYMENT_PENDING = "Pending"
    PAYMENT_PAID = "Paid"
    PAYMENT_FAILED = "Failed"
    PAYMENT_REFUNDED = "Refunded"

    PAYMENT_CHOICES = [
        (PAYMENT_PENDING, "Pending"),
        (PAYMENT_PAID, "Paid"),
        (PAYMENT_FAILED, "Failed"),
        (PAYMENT_REFUNDED, "Refunded"),
    ]

    STATUS_CONFIRMED = "Confirmed"
    STATUS_CANCELLED = "Cancelled"

    STATUS_CHOICES = [
        (STATUS_CONFIRMED, "Confirmed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    reference = models.CharField(max_length=20, unique=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    flight = models.ForeignKey(
        Flight,
        on_delete=models.CASCADE,
        related_name="bookings",
    )
    seats = models.PositiveIntegerField(default=1)
    passenger_name = models.CharField(max_length=150)
    passenger_email = models.EmailField()

    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default=PAYMENT_PENDING)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_CONFIRMED)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reference} ({self.passenger_name})"

    @staticmethod
    def make_reference():
        """Something like BK-8F3K2Q - short enough to read over the phone."""
        return "BK-" + uuid.uuid4().hex[:6].upper()
