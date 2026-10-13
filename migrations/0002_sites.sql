-- sites.motdang.net: traffic for each page's maker, messages from readers,
-- pictures from the public-domain library with their credit, and Gold.

-- tier: free · gold. gold_until: ISO date the Gold year ends.
ALTER TABLE site ADD COLUMN tier TEXT NOT NULL DEFAULT 'free';
ALTER TABLE site ADD COLUMN gold_until TEXT;
-- Where a copy of each reader's message goes, once the maker confirms it.
ALTER TABLE site ADD COLUMN notify_email TEXT;
ALTER TABLE site ADD COLUMN notify_ok INTEGER NOT NULL DEFAULT 0;
ALTER TABLE site ADD COLUMN notify_key TEXT;

-- A library picture's credit as JSON: {title, by, src, license, licenseUrl, from}.
ALTER TABLE photo ADD COLUMN credit TEXT;

-- One row per page, day, measure and key: views/people/machines (k ''),
-- ref (k = host), cc (k = country), dev (k = phone|tablet|computer),
-- lang (k = language), tap (k = call|line|dir|ride|share|…), hour (k = 00–23).
CREATE TABLE hit (
  site_id  TEXT NOT NULL,
  day      TEXT NOT NULL,
  m        TEXT NOT NULL,
  k        TEXT NOT NULL DEFAULT '',
  n        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (site_id, day, m, k)
);

-- Who came today, as a salted hash, to count each person once a day.
-- Rows older than two days are deleted by the cron.
CREATE TABLE seen (
  site_id  TEXT NOT NULL,
  day      TEXT NOT NULL,
  who      TEXT NOT NULL,
  PRIMARY KEY (site_id, day, who)
);

-- Messages readers send from a page. status: new · read · held (the check
-- bot wants a person to look) · gone.
CREATE TABLE msg (
  id       TEXT PRIMARY KEY,
  site_id  TEXT NOT NULL,
  at       TEXT NOT NULL,
  name     TEXT,
  reach    TEXT,
  body     TEXT NOT NULL,
  status   TEXT NOT NULL DEFAULT 'new',
  why      TEXT,
  sender   TEXT
);
CREATE INDEX msg_site ON msg (site_id, at);

-- Gold payments: a PromptPay amount with a satang tail that names the page,
-- the slip the payer sends, and what became of it.
CREATE TABLE pay (
  id       TEXT PRIMARY KEY,
  site_id  TEXT NOT NULL,
  amount   TEXT NOT NULL,
  status   TEXT NOT NULL DEFAULT 'open',
  slip     TEXT,
  note     TEXT,
  created  TEXT NOT NULL,
  updated  TEXT NOT NULL
);
CREATE INDEX pay_status ON pay (status, created);
