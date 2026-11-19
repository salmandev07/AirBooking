from rest_framework import serializers

from flights.models import Flight
from flights.serializers import FlightSerializer

from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    """Read side - also sends the flight details so the UI needs one request."""

    flight = FlightSerializer(read_only=True)
    flight_id = serializers.IntegerField(write_only=True)
    passenger_name = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "reference",
            "flight",
            "flight_id",
            "seats",
            "passenger_name",
            "passenger_email",
            "total_amount",
            "payment_status",
            "status",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "reference",
            "total_amount",
            "payment_status",
            "status",
            "created_at",
        ]

    def validate_seats(self, value):
        if value < 1:
            raise serializers.ValidationError("You must book at least one seat.")
        if value > 10:
            raise serializers.ValidationError("You can book at most 10 seats at a time.")
        return value

    def validate(self, attrs):
        flight_id = attrs.get("flight_id")
        seats = attrs.get("seats", 1)

        try:
            flight = Flight.objects.get(pk=flight_id)
        except Flight.DoesNotExist:
            raise serializers.ValidationError({"flight_id": "That flight does not exist."})

        if flight.available_seats < seats:
            raise serializers.ValidationError(
                {"seats": f"Only {flight.available_seats} seat(s) left on this flight."}
            )

        attrs["flight"] = flight
        return attrs
