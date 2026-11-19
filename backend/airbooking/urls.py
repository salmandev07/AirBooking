from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("accounts.urls")),
    path("api/admin/", include("accounts.admin_urls")),

    # flights + live status
    path("api/flights/", include("flights.urls")),
    path("api/admin/", include("flights.admin_urls")),
]
