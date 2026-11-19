from datetime import datetime, time, timedelta

from django.db.models import F, Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .live_status import get_live_status
from .models import Flight
from .serializers import FlightSerializer


class FlightSearchView(APIView):
    """GET /api/flights/search/?origin=DEL&destination=BOM&date=2026-06-01

    Every parameter is optional - leave them all out and you get the
    full flight list.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        origin = request.query_params.get("origin", "").strip()
        destination = request.query_params.get("destination", "").strip()
        date = request.query_params.get("date", "").strip()
        max_price = request.query_params.get("max_price", "").strip()
        only_available = request.query_params.get("only_available", "true") == "true"

        flights = Flight.objects.all()

        if origin:
            # Match either the code ("DEL") or the full airport name.
            flights = flights.filter(
                Q(origin_code__iexact=origin) | Q(origin__icontains=origin)
            )
        if destination:
            flights = flights.filter(
                Q(destination_code__iexact=destination) | Q(destination__icontains=destination)
            )
        if date:
            try:
                day = datetime.strptime(date, "%Y-%m-%d").date()
                start = timezone.make_aware(datetime.combine(day, time.min))
                end = start + timedelta(days=1)
                flights = flights.filter(departure_time__gte=start, departure_time__lt=end)
            except ValueError:
                return Response(
                    {"detail": "Date must look like YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if max_price:
            try:
                flights = flights.filter(price__lte=float(max_price))
            except ValueError:
                return Response(
                    {"detail": "max_price must be a number."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        if only_available:
            # Only keep flights that still have at least one free seat.
            flights = flights.filter(booked_seats__lt=F("total_seats"))

        serializer = FlightSerializer(flights, many=True)
        return Response({"count": len(serializer.data), "results": serializer.data})


class FlightDetailView(generics.RetrieveAPIView):
    """GET /api/flights/{id}/"""

    queryset = Flight.objects.all()
    serializer_class = FlightSerializer
    permission_classes = [IsAuthenticated]


class FlightLiveStatusView(APIView):
    """GET /api/flights/{id}/status/ - AirLabs data with a safe fallback."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            flight = Flight.objects.get(pk=pk)
        except Flight.DoesNotExist:
            return Response({"detail": "Flight not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(get_live_status(flight))


class MyFlightsView(APIView):
    """GET /api/flights/my/ - flights the logged in user has booked."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        flights = Flight.objects.filter(bookings__user=request.user).distinct()
        serializer = FlightSerializer(flights, many=True)
        return Response(serializer.data)
