from django.urls import path

from .views import FlightDetailView, FlightLiveStatusView, FlightSearchView, MyFlightsView

urlpatterns = [
    path("search/", FlightSearchView.as_view(), name="flight-search"),
    path("my/", MyFlightsView.as_view(), name="my-flights"),
    path("<int:pk>/", FlightDetailView.as_view(), name="flight-detail"),
    path("<int:pk>/status/", FlightLiveStatusView.as_view(), name="flight-status"),
]
