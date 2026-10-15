-- 2026-10-14: Gold's 30-day start, bookings, room calendars, translations,
-- the monthly note, and a page's own domain.

-- trial: 1 while the page is in the 30 days of Gold every new page starts with.
ALTER TABLE site ADD COLUMN trial INTEGER NOT NULL DEFAULT 0;
-- the month ('YYYY-MM') the last monthly note went out; the trial's end note.
ALTER TABLE site ADD COLUMN mailed TEXT;
ALTER TABLE site ADD COLUMN trial_told INTEGER NOT NULL DEFAULT 0;
-- a Gold page's own address (yourshop.com), its Cloudflare custom hostname id and state.
ALTER TABLE site ADD COLUMN domain TEXT;
ALTER TABLE site ADD COLUMN domain_id TEXT;
ALTER TABLE site ADD COLUMN domain_state TEXT;
CREATE UNIQUE INDEX site_domain ON site (domain) WHERE domain IS NOT NULL;

-- A reader's ask for a time (kind svc) or for nights (kind room).
-- svc: start/end are UTC ISO times. room: start = first night, end = the
-- morning out, both 'YYYY-MM-DD'. status: new · ok · no · gone.
CREATE TABLE booking (
  id       TEXT PRIMARY KEY,
  site_id  TEXT NOT NULL,
  kind     TEXT NOT NULL,
  item     TEXT NOT NULL,
  start    TEXT NOT NULL,
  end      TEXT NOT NULL,
  people   INTEGER NOT NULL DEFAULT 1,
  name     TEXT,
  reach    TEXT,
  email    TEXT,
  note     TEXT,
  status   TEXT NOT NULL DEFAULT 'new',
  at       TEXT NOT NULL,
  sender   TEXT
);
CREATE INDEX booking_site ON booking (site_id, kind, item, start);
CREATE INDEX booking_new ON booking (site_id, status, at);

-- Nights another site (Airbnb, Booking.com, Agoda …) says a room is taken,
-- read from the room's calendar addresses; replaced on each read.
CREATE TABLE block (
  site_id  TEXT NOT NULL,
  room     TEXT NOT NULL,
  day      TEXT NOT NULL,
  PRIMARY KEY (site_id, room, day)
);
CREATE TABLE ical_read (
  site_id  TEXT NOT NULL,
  room     TEXT NOT NULL,
  url      TEXT NOT NULL,
  at       TEXT NOT NULL,
  ok       INTEGER NOT NULL,
  nights   INTEGER,
  PRIMARY KEY (site_id, room, url)
);

-- A Gold page's words in another page language, written by Workers AI.
-- src = a hash of the words it was made from; a change makes it stale.
CREATE TABLE tr (
  site_id  TEXT NOT NULL,
  lang     TEXT NOT NULL,
  src      TEXT NOT NULL,
  d        TEXT NOT NULL,
  at       TEXT NOT NULL,
  PRIMARY KEY (site_id, lang)
);
