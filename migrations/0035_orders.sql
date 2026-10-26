-- 2026-10-26 (Nan: the online shop and the online business): orders from a page's products and downloads,
-- Mot Dang's parcel jobs for pages that ship with it, and how many times each paid download was fetched.
-- Money columns are whole satang. A page's own PromptPay is paid directly; Mot Dang only draws the QR.

-- status: new (waiting for money) · slip (the buyer sent a slip) · paid (the maker says it arrived) · no (the maker says it did not) · gone
CREATE TABLE orders (
  id         TEXT PRIMARY KEY,
  site_id    TEXT NOT NULL,
  at         TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new',
  lang       TEXT NOT NULL DEFAULT 'en',
  lines      TEXT NOT NULL,              -- JSON [{ k: 'p' | 'd', id, t, opt: [], q, u }]; u is one unit's price when the order was made
  name       TEXT NOT NULL,
  reach      TEXT,
  email      TEXT,
  addr       TEXT,
  cc         TEXT,
  note       TEXT,
  code       TEXT,
  sub        INTEGER NOT NULL,
  disc       INTEGER NOT NULL DEFAULT 0,
  delivery   INTEGER NOT NULL DEFAULT 0,
  tail       INTEGER NOT NULL DEFAULT 0, -- the satang that tells this order's payment from another
  total      INTEGER NOT NULL,
  grams      INTEGER NOT NULL DEFAULT 0,
  mot        INTEGER NOT NULL DEFAULT 0, -- 1: Mot Dang ships it
  slip       TEXT,
  slip_at    TEXT,
  paid_at    TEXT,
  stocked    INTEGER NOT NULL DEFAULT 0, -- 1: the stock counts took this order's goods off
  moved      TEXT,                       -- when the stock counts last moved for this order: a browser that read the page before it keeps the server's counts
  seen       INTEGER NOT NULL DEFAULT 0, -- 1: the maker has opened it
  track      TEXT,
  shipped_at TEXT,
  sender     TEXT
);
CREATE INDEX orders_site ON orders (site_id, at);

-- A parcel Mot Dang ships. status: wait (the maker brings it) · got (received) · sent (shipped, the maker owes the fee and postage)
CREATE TABLE shipjob (
  id       TEXT PRIMARY KEY,
  order_id TEXT NOT NULL UNIQUE,
  site_id  TEXT NOT NULL,
  at       TEXT NOT NULL,
  status   TEXT NOT NULL DEFAULT 'wait',
  got_at   TEXT,
  sent_at  TEXT,
  track    TEXT,
  fee      INTEGER NOT NULL DEFAULT 0,
  postage  INTEGER NOT NULL DEFAULT 0,
  pay_id   TEXT                          -- the pay row (plan 'ship') the maker settles it with
);
CREATE INDEX shipjob_site ON shipjob (site_id, at);

CREATE TABLE order_dl (
  order_id TEXT NOT NULL,
  dl       TEXT NOT NULL,
  n        INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (order_id, dl)
);
