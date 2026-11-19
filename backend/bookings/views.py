from decimal import Decimal

from django.db import transaction
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Booking
from .serializers import BookingSerializer


class BookingListCreateView(generics.ListCreateAPIView):
    """GET  /api/bookings/ - the logged in user's own bookings.
    POST /api/bookings/ - create a booking (with a simulated payment).
    """

    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # The seat count is validated, now lock the flight row so two
        # people clicking "book" at the same time cannot oversell it.
        with transaction.atomic():
            flight = serializer.validated_data["flight"]
            flight = type(flight).objects.select_for_update().get(pk=flight.pk)

            if flight.available_seats < serializer.validated_data["seats"]:
                return Response(
                    {"seats": "Sorry, those seats were just taken."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            seats = serializer.validated_data["seats"]
            passenger_name = serializer.validated_data.get("passenger_name") or request.user.get_full_name() or request.user.username

            booking = Booking.objects.create(
                user=request.user,
                flight=flight,
                seats=seats,
                passenger_name=passenger_name,
                passenger_email=serializer.validated_data.get("passenger_email") or request.user.email,
                total_amount=flight.price * Decimal(seats),
                reference=Booking.make_reference(),
                payment_status=Booking.PAYMENT_PENDING,
            )

            flight.booked_seats += seats
            flight.save(update_fields=["booked_seats", "updated_at"])

            # Simulated payment: everything the demo sends is accepted.
            if self._simulate_payment(request.data):
                booking.payment_status = Booking.PAYMENT_PAID
                booking.save(update_fields=["payment_status"])
            else:
                booking.payment_status = Booking.PAYMENT_FAILED
                booking.save(update_fields=["payment_status"])

        data = BookingSerializer(booking).data
        data["message"] = "Booking confirmed. Payment simulated successfully."
        return Response(data, status=status.HTTP_201_CREATED)

    @staticmethod
    def _simulate_payment(payload):
        """Pretend to talk to a payment gateway.

        Send {"simulate_failure": true} in the request body to see the
        failure path without needing a real card number.
        """
        return not payload.get("simulate_failure", False)


class BookingDetailView(generics.RetrieveAPIView):
    """GET /api/bookings/{id}/ - only the owner may read it."""

    serializer_class = BookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user)


class BookingCancelView(APIView):
    """POST /api/bookings/{id}/cancel/ - gives the seats back."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            booking = Booking.objects.select_related("flight").get(
                pk=pk, user=request.user
            )
        except Booking.DoesNotExist:
            return Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

        if booking.status == Booking.STATUS_CANCELLED:
            return Response({"detail": "This booking is already cancelled."})

        with transaction.atomic():
            booking.status = Booking.STATUS_CANCELLED
            booking.payment_status = Booking.PAYMENT_REFUNDED
            booking.save(update_fields=["status", "payment_status"])

            flight = booking.flight
            flight.booked_seats = max(flight.booked_seats - booking.seats, 0)
            flight.save(update_fields=["booked_seats", "updated_at"])

        return Response(BookingSerializer(booking).data)


class BookingStatsView(APIView):
    """GET /api/bookings/stats/ - numbers shown on the dashboards."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.is_staff:
            total = Booking.objects.count()
            revenue = sum(
                b.total_amount for b in Booking.objects.filter(payment_status=Booking.PAYMENT_PAID)
            )
            return Response({"total_bookings": total, "revenue": str(revenue)})

        mine = Booking.objects.filter(user=request.user)
        return Response(
            {
                "total_bookings": mine.count(),
                "upcoming": mine.filter(status=Booking.STATUS_CONFIRMED).count(),
                "cancelled": mine.filter(status=Booking.STATUS_CANCELLED).count(),
            }
        )
