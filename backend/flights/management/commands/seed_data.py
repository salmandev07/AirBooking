"""Fill the database with flights and the admin account.

    python manage.py seed_data
"""
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from accounts.models import User
from flights.models import Flight


# (flight number, airline, from code, from name, to code, to name,
#  hours from now, duration hours, price, seats, status)
SAMPLE_FLIGHTS = [
    ("AI-302", "Air India", "DEL", "Indira Gandhi International", "BOM", "Chhatrapati Shivaji Maharaj Intl", 6, 2, 4500, 180, "On Time"),
    ("AI-305", "Air India", "BOM", "Chhatrapati Shivaji Maharaj Intl", "DEL", "Indira Gandhi International", 9, 2, 4700, 180, "On Time"),
    ("6E-203", "IndiGo", "DEL", "Indira Gandhi International", "BLR", "Kempegowda International", 4, 3, 3900, 160, "Delayed"),
    ("6E-415", "IndiGo", "BLR", "Kempegowda International", "DEL", "Indira Gandhi International", 12, 3, 4100, 160, "On Time"),
    ("SG-801", "SpiceJet", "MAA", "Chennai International", "CCU", "Netaji Subhas Chandra Bose Intl", 7, 2.5, 3200, 140, "On Time"),
    ("SG-802", "SpiceJet", "CCU", "Netaji Subhas Chandra Bose Intl", "MAA", "Chennai International", 15, 2.5, 3300, 140, "On Time"),
    ("UK-815", "Vistara", "BOM", "Chhatrapati Shivaji Maharaj Intl", "HYD", "Rajiv Gandhi International", 5, 1.5, 3600, 150, "On Time"),
    ("UK-816", "Vistara", "HYD", "Rajiv Gandhi International", "BOM", "Chhatrapati Shivaji Maharaj Intl", 11, 1.5, 3700, 150, "Boarding"),
    ("AI-420", "Air India", "DEL", "Indira Gandhi International", "GOI", "Dabolim Airport", 26, 2.5, 5200, 170, "On Time"),
    ("6E-611", "IndiGo", "GOI", "Dabolim Airport", "DEL", "Indira Gandhi International", 31, 2.5, 5400, 170, "On Time"),
    ("AI-705", "Air India", "DEL", "Indira Gandhi International", "MAA", "Chennai International", 50, 3, 5800, 180, "On Time"),
    ("SG-119", "SpiceJet", "BLR", "Kempegowda International", "BOM", "Chhatrapati Shivaji Maharaj Intl", 72, 2, 3100, 160, "On Time"),
]


class Command(BaseCommand):
    help = "Create demo admin/user accounts and sample flights."

    def handle(self, *args, **options):
        self.create_users()
        self.create_flights()
        self.stdout.write(self.style.SUCCESS("Seed data is ready."))

    def create_users(self):
        admin, created = User.objects.get_or_create(
            username="admin",
            defaults={
                "email": "admin@airbooking.local",
                "email_verified": True,
                "is_staff": True,
                "is_superuser": True,
                "approval_status": User.APPROVED,
                "first_name": "Site",
                "last_name": "Admin",
            },
        )
        if created:
            admin.set_password("admin123")
            admin.save()
            self.stdout.write("  + admin / admin123")

    def create_flights(self):
        now = timezone.now()
        added = 0

        for row in SAMPLE_FLIGHTS:
            (
                number,
                airline,
                from_code,
                from_name,
                to_code,
                to_name,
                hours_away,
                duration,
                price,
                seats,
                status,
            ) = row

            if Flight.objects.filter(flight_number=number).exists():
                continue

            Flight.objects.create(
                flight_number=number,
                airline=airline,
                origin=from_name,
                origin_code=from_code,
                destination=to_name,
                destination_code=to_code,
                departure_time=now + timedelta(hours=hours_away),
                arrival_time=now + timedelta(hours=hours_away + duration),
                price=Decimal(price),
                total_seats=seats,
                status=status,
            )
            added += 1

        self.stdout.write(f"  + {added} flight(s) added")
