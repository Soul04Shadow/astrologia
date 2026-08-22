from __future__ import annotations

import time

from geopy.exc import GeocoderServiceError
from geopy.geocoders import Nominatim
from timezonefinder import TimezoneFinder

_tf = TimezoneFinder()
_cache: dict[str, tuple[float, float, str]] = {}
CACHE_TTL_SECONDS = 7 * 24 * 3600


def _geocode_nominatim(query: str):
    geolocator = Nominatim(user_agent="vedic-ai-astrologer/1.0", timeout=10)
    return geolocator.geocode(query, addressdetails=True, language="en")


def search_place(query: str) -> list[dict]:
    try:
        geolocator = Nominatim(user_agent="vedic-ai-astrologer/1.0", timeout=10)
        results = geolocator.geocode(query, exactly_one=False, limit=5, addressdetails=True, language="en") or []
        out = []
        for r in results:
            tz = _tf.timezone_at(lat=r.latitude, lng=r.longitude) or "UTC"
            out.append({
                "display_name": r.address,
                "name": (r.raw.get("name") or r.address.split(",")[0]),
                "latitude": round(r.latitude, 6),
                "longitude": round(r.longitude, 6),
                "tz_name": tz,
            })
        return out
    except GeocoderServiceError as e:
        raise RuntimeError(f"Geocoding service unavailable: {e}") from e


def resolve_place(name: str) -> dict:
    key = name.strip().lower()
    hit = _cache.get(key)
    if hit and time.time() - hit[2] < CACHE_TTL_SECONDS:
        return {"name": name, "latitude": hit[0], "longitude": hit[1], "tz_name": hit[3]}
    r = _geocode_nominatim(name)
    if not r:
        raise ValueError(f"Could not find place '{name}'")
    tz = _tf.timezone_at(lat=r.latitude, lng=r.longitude) or "UTC"
    _cache[key] = (r.latitude, r.longitude, time.time(), tz)
    return {"name": name, "latitude": round(r.latitude, 6), "longitude": round(r.longitude, 6), "tz_name": tz}
