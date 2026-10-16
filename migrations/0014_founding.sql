-- 2026-10-16, NaN: a way for people to dip their toes in, under the investors'
-- cheque. "Build 4 (founding membership) now." A founding member pays once and
-- gets two Gold codes (a Gold year each, for any page) and a number on the wall
-- at /founders. Seats and price per month, the price on a Shoup ladder (founding.mjs).
CREATE TABLE founder (
  id TEXT PRIMARY KEY,
  n INTEGER UNIQUE,              -- the founder's number, given when the slip is good
  name TEXT NOT NULL,
  show INTEGER NOT NULL DEFAULT 1, -- 1: the name is on the wall
  contact TEXT,                  -- LINE or phone, for Beer if a slip needs a look
  pay_id TEXT NOT NULL,
  price INTEGER NOT NULL,        -- the month's price when they asked
  status TEXT NOT NULL DEFAULT 'open', -- open · paid
  month TEXT,                    -- Bangkok month paid (YYYY-MM)
  made TEXT NOT NULL,
  paid_at TEXT
);
CREATE INDEX founder_pay ON founder (pay_id);
CREATE INDEX founder_month ON founder (status, month);
CREATE TABLE gift (
  code TEXT PRIMARY KEY,
  founder TEXT NOT NULL,
  made TEXT NOT NULL,
  site_id TEXT,                  -- the page it made Gold
  used TEXT
);
CREATE TABLE founding_month (
  month TEXT PRIMARY KEY,        -- YYYY-MM, Bangkok
  price INTEGER NOT NULL,
  seats INTEGER NOT NULL
);
