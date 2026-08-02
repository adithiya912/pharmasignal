from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# .env lives at the repo root (shared with web/), not inside ml-services/.
# Resolved from this file's location rather than CWD, so loading works the
# same whether uvicorn is started from ml-services/ or elsewhere.
_REPO_ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_REPO_ROOT_ENV, env_file_encoding="utf-8", extra="ignore")

    neo4j_uri: str | None = None
    neo4j_username: str | None = None
    neo4j_password: str | None = None


settings = Settings()
