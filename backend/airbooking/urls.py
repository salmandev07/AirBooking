from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),

    # auth + user approval
    path("api/auth/", include("accounts.urls")),

    # flights + live status
    path("api/flights/", include("flights.urls")),

    # bookings
    path("api/bookings/", include("bookings.urls")),

    # admin panel endpoints (called by the React admin dashboard)
    path("api/admin/", include("accounts.admin_urls")),
    path("api/admin/", include("flights.admin_urls")),
]
