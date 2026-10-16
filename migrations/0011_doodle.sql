-- 2026-10-16, Nan: "People should be able to easily doodle whatever they can imagine (within guardrails)
-- and use it to self-promote on their site." Doodle anything (src/doodle.mjs).
-- doodle_use: what a page has asked for today (a Bangkok day); site_id '*' is every page together.
-- n counts doodles asked for (each brings two pictures); refused counts words turned away.
CREATE TABLE doodle_use (
  site_id TEXT NOT NULL,
  day     TEXT NOT NULL,
  n       INTEGER NOT NULL DEFAULT 0,
  refused INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (site_id, day)
);
-- doodle: each picture made, kept or not. The files sit in R2 under p/<id> and p/<id>-s like any
-- photo; a picture nobody kept goes after a day. Keeping one adds its photo row (credit
-- {from:'doodle', style, prompt}).
CREATE TABLE doodle (
  id      TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  created TEXT NOT NULL,
  style   TEXT NOT NULL,
  prompt  TEXT NOT NULL,
  ext     TEXT NOT NULL,
  bytes   INTEGER NOT NULL,
  w       INTEGER,
  h       INTEGER,
  model   TEXT,
  kept    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX doodle_old ON doodle (kept, created);
CREATE INDEX doodle_site ON doodle (site_id, created);
