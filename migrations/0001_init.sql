-- One row per page. `d` is the page's content as JSON (render.mjs reads it).
-- status: draft (only the edit link sees it) · live · held (the check bot
-- wants a person to look) · removed.
CREATE TABLE site (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  edit_hash  TEXT NOT NULL UNIQUE,
  status     TEXT NOT NULL DEFAULT 'draft',
  kind       TEXT NOT NULL,
  look       TEXT NOT NULL,
  lang       TEXT NOT NULL,
  d          TEXT NOT NULL,
  cc         TEXT,
  lat        REAL,
  lng        REAL,
  views      INTEGER NOT NULL DEFAULT 0,
  held_why   TEXT,
  sender     TEXT,
  created    TEXT NOT NULL,
  updated    TEXT NOT NULL,
  published  TEXT
);
CREATE INDEX site_status ON site (status, published);
CREATE INDEX site_cc ON site (cc, status);

-- Photos in R2 under p/<id>.webp (or .jpg); `small` is the 480 px copy.
CREATE TABLE photo (
  id       TEXT PRIMARY KEY,
  site_id  TEXT NOT NULL,
  ext      TEXT NOT NULL,
  bytes    INTEGER NOT NULL,
  w        INTEGER,
  h        INTEGER,
  role     TEXT NOT NULL DEFAULT 'photo',
  verdict  TEXT NOT NULL,
  why      TEXT,
  created  TEXT NOT NULL
);
CREATE INDEX photo_site ON photo (site_id);

-- What happened, for the admin page and the digest.
CREATE TABLE event (
  at       TEXT NOT NULL,
  site_id  TEXT,
  what     TEXT NOT NULL,
  note     TEXT
);
CREATE INDEX event_at ON event (at);

-- Reports from readers; one per reader per page.
CREATE TABLE report (
  site_id  TEXT NOT NULL,
  who      TEXT NOT NULL,
  why      TEXT,
  at       TEXT NOT NULL,
  PRIMARY KEY (site_id, who)
);

-- Per-connection daily counts (salted hash of the address, never the address).
CREATE TABLE quota (
  who   TEXT NOT NULL,
  day   TEXT NOT NULL,
  what  TEXT NOT NULL,
  n     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (who, day, what)
);
