from django.db import models


class Flight(models.Model):
    """One scheduled flight between two airports."""

    STATUS_ON_TIME = "On Time"
    STATUS_DELAYED = "Delayed"
    STATUS_BOARDING = "Boarding"
    STATUS_DEPARTED = "Departed"
    STATUS_LANDED = "Landed"
    STATUS_CANCELLED = "Cancelled"

    STATUS_CHOICES = [
        (STATUS_ON_TIME, "On Time"),
        (STATUS_DELAYED, "Delayed"),
        (STATUS_BOARDING, "Boarding"),
        (STATUS_DEPARTED, "Departed"),
        (STATUS_LANDED, "Landed"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    flight_number = models.CharField(max_length=20, unique=True)
    airline = models.CharField(max_length=100)

    origin = models.CharField(max_length=100)       # e.g. "Indira Gandhi International"
    origin_code = models.CharField(max_length=3)    # e.g. "DEL"
    destination = models.CharField(max_length=100)
    destination_code = models.CharField(max_length=3)

    departure_time = models.DateTimeField()
    arrival_time = models.DateTimeField()

    price = models.DecimalField(max_digits=10, decimal_places=2)
    total_seats = models.PositiveIntegerField(default=180)
    booked_seats = models.PositiveIntegerField(default=0)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ON_TIME)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["departure_time"]

    def __str__(self):
        return f"{self.flight_number} {self.origin_code} -> {self.destination_code}"

    @property
    def available_seats(self):
        return max(self.total_seats - self.booked_seats, 0)

    @property
    def is_full(self):
        return self.available_seats <= 0
