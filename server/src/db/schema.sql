-- Shelfwise social cache schema

CREATE TABLE IF NOT EXISTS actors (
  did           TEXT PRIMARY KEY,
  handle        TEXT NOT NULL,
  display_name  TEXT,
  avatar_url    TEXT,
  indexed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follows (
  follower_did  TEXT NOT NULL REFERENCES actors(did) ON DELETE CASCADE,
  subject_did   TEXT NOT NULL REFERENCES actors(did) ON DELETE CASCADE,
  rkey          TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_did, subject_did)
);

CREATE TABLE IF NOT EXISTS feed_events (
  id            BIGSERIAL PRIMARY KEY,
  did           TEXT NOT NULL,
  collection    TEXT NOT NULL,
  rkey          TEXT NOT NULL,
  operation     TEXT NOT NULL,
  record_json   JSONB,
  event_time    TIMESTAMPTZ NOT NULL,
  indexed_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_events_time ON feed_events(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_feed_events_did ON feed_events(did);
CREATE INDEX IF NOT EXISTS idx_feed_events_collection ON feed_events(collection);

CREATE TABLE IF NOT EXISTS jetstream_state (
  id            INTEGER PRIMARY KEY DEFAULT 1,
  cursor_us     BIGINT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO jetstream_state (id, cursor_us) VALUES (1, 0)
  ON CONFLICT (id) DO NOTHING;
