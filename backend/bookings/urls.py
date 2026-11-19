from django.urls import path

from .views import BookingCancelView, BookingDetailView, BookingListCreateView, BookingStatsView

urlpatterns = [
    path("", BookingListCreateView.as_view(), name="booking-list"),
    path("stats/", BookingStatsView.as_view(), name="booking-stats"),
    path("<int:pk>/", BookingDetailView.as_view(), name="booking-detail"),
    path("<int:pk>/cancel/", BookingCancelView.as_view(), name="booking-cancel"),
]
