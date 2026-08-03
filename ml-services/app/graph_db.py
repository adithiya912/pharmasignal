from functools import lru_cache

from neo4j import Driver, GraphDatabase

from app.config import settings

# Long-running processes can sit idle for hours between requests. Neo4j
# Aura's load balancer silently drops idle TCP connections well before
# the driver's default max_connection_lifetime (1 hour), and by default
# (liveness_check_timeout=None) the driver never verifies a pooled
# connection is still alive before reusing it — it just tries and fails
# with ServiceUnavailable. That's exactly what happened after a
# multi-hour idle gap here, requiring a manual restart.
#
# liveness_check_timeout pings a pooled connection before handing it
# out if it's been idle longer than this many seconds, transparently
# replacing it with a fresh one if the ping fails — the driver recovers
# on its own instead of surfacing the failure to the caller. Paired
# with a shorter max_connection_lifetime so connections are proactively
# recycled well within typical cloud idle-timeout windows.
_LIVENESS_CHECK_TIMEOUT_SECONDS = 60
_MAX_CONNECTION_LIFETIME_SECONDS = 300


@lru_cache(maxsize=1)
def get_driver() -> Driver:
    return GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_username, settings.neo4j_password),
        liveness_check_timeout=_LIVENESS_CHECK_TIMEOUT_SECONDS,
        max_connection_lifetime=_MAX_CONNECTION_LIFETIME_SECONDS,
    )
