"""Session tokens: a username signed with HMAC-SHA256, kept in an HttpOnly cookie.

A token is ``<username>.<signature>``, where the signature is the URL-safe base64 HMAC of the
username under the ``SECRET_KEY`` setting. The server keeps no session table: a token stays
valid until the cookie expires or the key changes, and it names a learner by username, so it
survives a demo reset that recreates the learners with new ids (docs/adr/0003).
"""

import base64
import hashlib
import hmac
from datetime import timedelta

SESSION_COOKIE = "duo_session"
SESSION_MAX_AGE = timedelta(days=30)


def sign_session(username: str, secret_key: str) -> str:
    """Return the session token for ``username``."""
    return f"{username}.{_signature(username, secret_key)}"


def read_session(token: str, secret_key: str) -> str | None:
    """Return the username in a valid token, or None when it is malformed or tampered with."""
    username, dot, signature = token.rpartition(".")
    if not dot or not username:
        return None
    # Compared as bytes: compare_digest rejects str arguments with non-ASCII characters.
    if not hmac.compare_digest(signature.encode(), _signature(username, secret_key).encode()):
        return None
    return username


def _signature(username: str, secret_key: str) -> str:
    digest = hmac.new(secret_key.encode(), username.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
