-- Recreate events table with platform column in the primary key.
-- D1/SQLite can't alter primary keys in place, so we rebuild.
CREATE TABLE events_new (
  date TEXT NOT NULL,
  version TEXT NOT NULL,
  os TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'unknown',
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, version, os, platform)
);

INSERT INTO events_new (date, version, os, platform, count)
SELECT date, version, os, 'unknown', count FROM events;

DROP TABLE events;
ALTER TABLE events_new RENAME TO events;
