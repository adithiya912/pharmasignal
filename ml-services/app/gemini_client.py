import os
from functools import lru_cache

from google import genai

from app.config import settings  # noqa: F401  (triggers .env loading — see config.py)

MODEL = "gemini-flash-latest"


class ChatNotConfigured(RuntimeError):
    """Raised when no Gemini credentials are available — callers return
    an honest 503 instead of a fabricated answer."""


@lru_cache(maxsize=1)
def get_gemini_client() -> genai.Client:
    # Checked explicitly (rather than letting the SDK fail lazily on the
    # first request) so a missing key always surfaces as this specific,
    # honest error — no dependence on the SDK's own error shape for a
    # bad/absent key, which the anthropic SDK's own history here showed
    # can't be assumed without direct verification.
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ChatNotConfigured("No GEMINI_API_KEY found in environment.")
    return genai.Client(api_key=api_key)
