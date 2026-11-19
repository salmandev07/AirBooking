from django.contrib import admin

from .models import Flight


@admin.register(Flight)
class FlightAdmin(admin.ModelAdmin):
    list_display = (
        "flight_number",
        "airline",
        "origin_code",
        "destination_code",
        "departure_time",
        "price",
        "available_seats",
        "status",
    )
    list_filter = ("status", "airline")
    search_fields = ("flight_number", "origin", "destination")
