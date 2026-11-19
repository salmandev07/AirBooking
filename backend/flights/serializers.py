from rest_framework import serializers

from .models import Flight


class FlightSerializer(serializers.ModelSerializer):
    available_seats = serializers.IntegerField(read_only=True)

    class Meta:
        model = Flight
        fields = [
            "id",
            "flight_number",
            "airline",
            "origin",
            "origin_code",
            "destination",
            "destination_code",
            "departure_time",
            "arrival_time",
            "price",
            "total_seats",
            "booked_seats",
            "available_seats",
            "status",
            "created_at",
        ]


class FlightSearchSerializer(serializers.Serializer):
    """Query parameters accepted by the search endpoint."""

    origin = serializers.CharField(required=False, allow_blank=True)
    destination = serializers.CharField(required=False, allow_blank=True)
    date = serializers.DateField(required=False)
    max_price = serializers.DecimalField(required=False, max_digits=10, decimal_places=2)
    only_available = serializers.BooleanField(required=False, default=True)
