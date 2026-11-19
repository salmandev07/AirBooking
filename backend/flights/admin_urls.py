from django.urls import path

from .admin_views import (
    AdminFlightDetailView,
    AdminFlightListView,
    AdminFlightStatsView,
    AdminFlightStatusView,
)

urlpatterns = [
    path("flights/", AdminFlightListView.as_view(), name="admin-flight-list"),
    path("flights/stats/", AdminFlightStatsView.as_view(), name="admin-flight-stats"),
    path("flights/<int:pk>/", AdminFlightDetailView.as_view(), name="admin-flight-detail"),
    path("flights/<int:pk>/status/", AdminFlightStatusView.as_view(), name="admin-flight-status"),
]
