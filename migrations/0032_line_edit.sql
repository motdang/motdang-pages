-- 2026-10-22: Edit by LINE (Gold). An owner links a LINE account to a page once; after that a photo sent to the
-- Mot Dang LINE account joins the page's photos and a text becomes a dated note under News.

-- One LINE account per page and one page per LINE account. `uid` is the user id LINE gives the Mot Dang account;
-- `name` is the LINE display name at the time of linking, shown only to the owner in the editor.
CREATE TABLE line_link (
  site_id  TEXT PRIMARY KEY,
  uid      TEXT NOT NULL UNIQUE,
  name     TEXT,
  at       TEXT NOT NULL
);

-- A one-time code the editor shows (PAGE-XXXXXX, 30 minutes). Only a hash is kept.
CREATE TABLE line_code (
  hash     TEXT PRIMARY KEY,
  site_id  TEXT NOT NULL,
  exp      INTEGER NOT NULL
);
CREATE INDEX line_code_site ON line_code (site_id);

-- A page's dated notes (News). status: shown · held (the text check wants a person or the retry) · gone.
-- msg is the LINE message id, so a message LINE delivers twice is one note.
CREATE TABLE note (
  id       TEXT PRIMARY KEY,
  site_id  TEXT NOT NULL,
  at       TEXT NOT NULL,
  body     TEXT NOT NULL,
  status   TEXT NOT NULL DEFAULT 'shown',
  why      TEXT,
  via      TEXT NOT NULL DEFAULT 'line',
  msg      TEXT UNIQUE
);
CREATE INDEX note_site ON note (site_id, status, at);

-- LINE message ids already turned into a photo.
CREATE TABLE line_msg (
  msg      TEXT PRIMARY KEY,
  site_id  TEXT NOT NULL,
  at       TEXT NOT NULL
);

-- 'line' on a photo that came in by LINE, so the editor can add it to a page it saved from an older copy.
ALTER TABLE photo ADD COLUMN via TEXT;
