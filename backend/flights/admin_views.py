from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.admin_views import IsAdmin

from .models import Flight
from .serializers import FlightSerializer


class AdminFlightListView(generics.ListCreateAPIView):
    """GET  /api/admin/flights/ - list every flight
    POST /api/admin/flights/ - create a new flight
    """

    queryset = Flight.objects.all()
    serializer_class = FlightSerializer
    permission_classes = [IsAdmin]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class AdminFlightDetailView(generics.RetrieveUpdateAPIView):
    """GET   /api/admin/flights/{id}/
    PUT   /api/admin/flights/{id}/
    PATCH /api/admin/flights/{id}/
    """

    queryset = Flight.objects.all()
    serializer_class = FlightSerializer
    permission_classes = [IsAdmin]


class AdminFlightStatusView(APIView):
    """PUT /api/admin/flights/{id}/status/ - flip a flight to Delayed etc."""

    permission_classes = [IsAdmin]

    def put(self, request, pk):
        try:
            flight = Flight.objects.get(pk=pk)
        except Flight.DoesNotExist:
            return Response({"detail": "Flight not found."}, status=status.HTTP_404_NOT_FOUND)

        new_status = request.data.get("status", "")
        valid = [code for code, _ in Flight.STATUS_CHOICES]
        if new_status not in valid:
            return Response(
                {"status": f"Choose one of: {', '.join(valid)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        flight.status = new_status
        flight.save(update_fields=["status", "updated_at"])
        return Response(FlightSerializer(flight).data)


class AdminFlightStatsView(APIView):
    """GET /api/admin/flights/stats/ - booking numbers for the dashboard."""

    permission_classes = [IsAdmin]

    def get(self, request):
        from bookings.models import Booking
        from django.contrib.auth import get_user_model

        User = get_user_model()
        flights = Flight.objects.all()
        return Response(
            {
                "total_flights": flights.count(),
                "total_seats": sum(f.total_seats for f in flights),
                "booked_seats": sum(f.booked_seats for f in flights),
                "total_bookings": Booking.objects.count(),
                "confirmed_bookings": Booking.objects.filter(status=Booking.STATUS_CONFIRMED).count(),
                "pending_users": User.objects.filter(approval_status="pending").count(),
            }
        )
