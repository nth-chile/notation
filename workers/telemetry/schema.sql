CREATE TABLE IF NOT EXISTS events (
  date TEXT NOT NULL,
  version TEXT NOT NULL,
  os TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (date, version, os)
);
