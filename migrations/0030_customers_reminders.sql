-- 2026-10-22 (Nan: customer list and one broadcast a month; reminders to guests the day before).
-- news = 1 when the person ticked "News from <page>, once a month at most" on the booking or message form.
-- ok_at = when the maker (or the page, on its own) accepted the booking; remind_email = when the day-before
-- email went (or 'skip'); line_uid = the LINE Login user id a guest gave on /bk/<id>; remind_line = when the
-- LINE reminder was handed to the LINE account (its Site.remind), cleared when the booking is cancelled first.
ALTER TABLE booking ADD COLUMN news INTEGER NOT NULL DEFAULT 0;
ALTER TABLE booking ADD COLUMN ok_at TEXT;
ALTER TABLE booking ADD COLUMN remind_email TEXT;
ALTER TABLE booking ADD COLUMN line_uid TEXT;
ALTER TABLE booking ADD COLUMN remind_line TEXT;
ALTER TABLE msg ADD COLUMN news INTEGER NOT NULL DEFAULT 0;
ALTER TABLE msg ADD COLUMN email TEXT;

-- Addresses that pressed unsubscribe for a page. A new tick of the news box clears the row.
CREATE TABLE news_off (
  site_id TEXT NOT NULL,
  email   TEXT NOT NULL,
  at      TEXT NOT NULL,
  PRIMARY KEY (site_id, email)
);

-- One broadcast a month per page. month = YYYY-MM in the page's time zone; the unique pair is the once-a-month rule.
CREATE TABLE news_sent (
  id      TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  month   TEXT NOT NULL,
  at      TEXT NOT NULL,
  body    TEXT NOT NULL,
  link    TEXT,
  asked   INTEGER NOT NULL DEFAULT 0,
  sent    INTEGER NOT NULL DEFAULT 0,
  failed  INTEGER NOT NULL DEFAULT 0,
  state   TEXT NOT NULL DEFAULT 'sending',
  UNIQUE (site_id, month)
);
CREATE INDEX booking_remind ON booking (status, remind_email, start);
