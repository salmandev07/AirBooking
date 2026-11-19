"""
Live flight status helper.

It tries the AirLabs API first because it is simple and free-tier friendly.
If there is no API key, the request times out, or AirLabs returns nothing,
we fall back to a status that is worked out from the flight's own schedule.
That way the page always shows something useful.
"""
import logging

import requests
from django.conf import settings
from django.utils import timezone

from .models import Flight

logger = logging.getLogger(__name__)

AIRLABS_URL = "https://api.airlabs.co/v9/flight"


def get_live_status(flight):
    """Return a dict describing where a flight currently is."""
    live = _fetch_from_airlabs(flight)
    if live:
        return live
    return _fallback_status(flight)


def _fetch_from_airlabs(flight):
    api_key = settings.AIRLABS_API_KEY
    if not api_key:
        logger.info("No AIRLABS_API_KEY set, using simulated status")
        return None

    try:
        response = requests.get(
            AIRLABS_URL,
            params={"api_key": api_key, "call": flight.flight_number},
            timeout=settings.LIVE_STATUS_TIMEOUT,
        )
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException as exc:
        logger.warning("AirLabs request failed: %s", exc)
        return None

    flights = payload.get("response", {}).get("flights") or []
    if not flights:
        return None

    first = flights[0]
    return {
        "source": "AirLabs",
        "flight_number": first.get("flight_iata") or flight.flight_number,
        "status": _normalise_airlabs_status(first.get("status")),
        "lat": first.get("lat"),
        "lon": first.get("lon"),
        "altitude": first.get("alt"),
        "speed": first.get("speed"),
        "origin": first.get("origin_iata") or flight.origin_code,
        "destination": first.get("dest_iata") or flight.destination_code,
        "updated_at": first.get("updated"),
    }


def _normalise_airlabs_status(raw):
    """Turn AirLabs wording into the same labels the UI already uses."""
    if not raw:
        return Flight.STATUS_ON_TIME

    raw = str(raw).lower()
    if "cancel" in raw:
        return Flight.STATUS_CANCELLED
    if "land" in raw:
        return Flight.STATUS_LANDED
    if "depart" in raw or "enroute" in raw or "airborne" in raw:
        return Flight.STATUS_DEPARTED
    if "board" in raw:
        return Flight.STATUS_BOARDING
    if "delay" in raw or "late" in raw:
        return Flight.STATUS_DELAYED
    return Flight.STATUS_ON_TIME


def _fallback_status(flight):
    """Work out a believable status using only the data we already have."""
    now = timezone.localtime(flight.departure_time)
    arrival = timezone.localtime(flight.arrival_time)
    now_local = timezone.localtime(timezone.now())

    minutes_to_departure = (now - now_local).total_seconds() / 60

    if flight.status == Flight.STATUS_CANCELLED:
        current = Flight.STATUS_CANCELLED
    elif flight.status == Flight.STATUS_DELAYED:
        # A delayed flight stays delayed until it actually takes off.
        current = Flight.STATUS_DELAYED if minutes_to_departure > -5 else Flight.STATUS_DEPARTED
    elif minutes_to_departure > 15:
        current = Flight.STATUS_ON_TIME
    elif minutes_to_departure > -5:
        current = Flight.STATUS_BOARDING
    elif now_local < arrival:
        current = Flight.STATUS_DEPARTED
    else:
        current = Flight.STATUS_LANDED

    # Rough position: 0% before departure, 100% once it has landed.
    total = (arrival - now).total_seconds()
    done = (now_local - now).total_seconds()
    if total <= 0:
        progress = 100.0
    else:
        progress = round(min(max(done / total, 0.0), 1.0) * 100, 1)

    return {
        "source": "Simulated",
        "flight_number": flight.flight_number,
        "status": current,
        "progress_percent": progress,
        "origin": flight.origin_code,
        "destination": flight.destination_code,
        "scheduled_departure": flight.departure_time.isoformat(),
        "scheduled_arrival": flight.arrival_time.isoformat(),
        "delay_minutes": _delay_minutes(flight),
        "updated_at": timezone.now().isoformat(),
        "note": "Live tracking disabled - showing schedule based status.",
    }


def _delay_minutes(flight):
    if flight.status != Flight.STATUS_DELAYED:
        return 0
    # A delayed flight is assumed to slip by one hour unless told otherwise.
    return 60
