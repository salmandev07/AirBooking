from django.contrib import admin

from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "reference",
        "passenger_name",
        "flight",
        "seats",
        "total_amount",
        "payment_status",
        "status",
        "created_at",
    )
    list_filter = ("payment_status", "status")
    search_fields = ("reference", "passenger_name", "passenger_email")
    readonly_fields = ("reference", "created_at")
