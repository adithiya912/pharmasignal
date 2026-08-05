from pathlib import Path

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# .env lives at the repo root (shared with web/), not inside ml-services/.
# Resolved from this file's location rather than CWD, so loading works the
# same whether uvicorn is started from ml-services/ or elsewhere.
_REPO_ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"

# pydantic-settings' env_file below only populates the Settings object
# below — it does NOT export values into os.environ for other libraries
# to read. app/chat.py's `anthropic.Anthropic()` reads ANTHROPIC_API_KEY
# via os.environ directly (that's the SDK's own convention, not ours), so
# it needs an explicit load_dotenv() here to see a key placed in the same
# shared root .env as NEO4J_URI/etc. Safe to call even if the file/var is
# absent — this never overrides a real OS-level env var (override=False).
load_dotenv(_REPO_ROOT_ENV, override=False)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_REPO_ROOT_ENV, env_file_encoding="utf-8", extra="ignore")

    neo4j_uri: str | None = None
    neo4j_username: str | None = None
    neo4j_password: str | None = None


settings = Settings()
