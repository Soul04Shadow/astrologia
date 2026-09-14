from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock
from fastapi import HTTPException, Request

class SlidingWindowRateLimiter:
    """
    In-memory thread-safe sliding window rate limiter for protecting sensitive endpoints
    against denial-of-service, quota exhaustion, and automated credential or LLM abuse.
    """
    def __init__(self, requests_limit: int = 20, window_seconds: int = 60):
        self.requests_limit = requests_limit
        self.window_seconds = window_seconds
        self._history: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def check(self, identifier: str) -> None:
        now = time.time()
        cutoff = now - self.window_seconds

        with self._lock:
            # Clean expired timestamps for this identifier
            valid_timestamps = [t for t in self._history[identifier] if t > cutoff]
            if len(valid_timestamps) >= self.requests_limit:
                retry_after = int(self.window_seconds - (now - valid_timestamps[0])) + 1
                raise HTTPException(
                    status_code=429,
                    detail="Rate limit exceeded. Please wait before submitting additional requests.",
                    headers={"Retry-After": str(max(1, retry_after))},
                )
            valid_timestamps.append(now)
            self._history[identifier] = valid_timestamps

    def cleanup_old_keys(self) -> None:
        """Periodic eviction of keys idle longer than 2x window."""
        now = time.time()
        cutoff = now - (self.window_seconds * 2)
        with self._lock:
            stale = [k for k, ts in self._history.items() if not ts or ts[-1] < cutoff]
            for k in stale:
                self._history.pop(k, None)


# Pre-configured rate limiters
chat_rate_limiter = SlidingWindowRateLimiter(requests_limit=20, window_seconds=60)
translate_rate_limiter = SlidingWindowRateLimiter(requests_limit=15, window_seconds=60)
auth_rate_limiter = SlidingWindowRateLimiter(requests_limit=30, window_seconds=60)


def get_client_ip(request: Request) -> str:
    # Check standard proxy headers
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"
