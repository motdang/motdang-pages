-- 2026-10-19, NaN: "an app that automagically shares my contact info or a motdang link with
-- anyone who performs a gesture or bump with their phone … 100x more mindblowing than qr code."
-- /tap (tap.mjs). A tap is a card and what a touch gives; an NFC sticker carries /tap/<id>.
CREATE TABLE tap (
  id TEXT PRIMARY KEY,           -- the sticker's address, /tap/<id>
  key_sha TEXT NOT NULL,         -- SHA-256 of the owner link's token
  name TEXT NOT NULL,
  role TEXT,                     -- a line under the name
  phone TEXT,
  email TEXT,
  line TEXT,                     -- LINE id
  site TEXT,                     -- a sites.motdang.net page name
  give TEXT NOT NULL DEFAULT 'card', -- card · link
  link TEXT,                     -- given when give = 'link'
  link_label TEXT,
  lang TEXT,
  taps INTEGER NOT NULL DEFAULT 0,
  bumps INTEGER NOT NULL DEFAULT 0,
  made TEXT NOT NULL,
  changed TEXT
);
CREATE TABLE tap_day (
  id TEXT NOT NULL,
  day TEXT NOT NULL,
  taps INTEGER NOT NULL DEFAULT 0,
  bumps INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id, day)
);
-- A bump waits here a minute for the phone it hit; the cron and each new bump clear old rows.
CREATE TABLE bump (
  id TEXT PRIMARY KEY,
  t INTEGER NOT NULL,            -- the knock, server clock, ms
  lat REAL,
  lng REAL,
  net TEXT,                      -- the connection's /24 (or /48), hashed
  give TEXT NOT NULL,            -- JSON: {"tap": id} or {"card": {...}}
  peer TEXT,
  made INTEGER NOT NULL
);
CREATE INDEX bump_t ON bump (t);
