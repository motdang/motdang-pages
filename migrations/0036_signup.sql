-- 2026-10-26 (Nan: an online business page takes sign-ups for its news).
-- One row per address a visitor typed in the sign-up box. ok_at is when the button on /j/<key> was pressed:
-- only then is the address a customer who said yes. mailed_at and mails count the confirm emails sent.
CREATE TABLE signup (
  id        TEXT PRIMARY KEY,
  site_id   TEXT NOT NULL,
  email     TEXT NOT NULL,
  name      TEXT NOT NULL DEFAULT '',
  at        TEXT NOT NULL,
  mailed_at TEXT,
  mails     INTEGER NOT NULL DEFAULT 0,
  ok_at     TEXT,
  sender    TEXT,
  UNIQUE (site_id, email)
);
CREATE INDEX signup_site ON signup (site_id, ok_at);
