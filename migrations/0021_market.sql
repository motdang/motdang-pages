-- ตลาดพระ (src/market.mjs): Guess the hammer, who is at the market now, สาธุ on sellers' amulets
CREATE TABLE IF NOT EXISTS market_guess (
  aid    INTEGER NOT NULL,  -- the G-Pra auction
  guess  INTEGER NOT NULL,  -- baht
  price  INTEGER NOT NULL,  -- the hammer, at the time of the guess
  handle TEXT NOT NULL DEFAULT '', -- a made-up name, "a.b.n" from the two lists in market.mjs
  who    TEXT,
  day    TEXT NOT NULL,     -- Bangkok day
  at     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS market_guess_aid ON market_guess (aid);
CREATE INDEX IF NOT EXISTS market_guess_day ON market_guess (day);
CREATE TABLE IF NOT EXISTS market_here (id TEXT PRIMARY KEY, at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS market_sadhu (site TEXT NOT NULL, amulet TEXT NOT NULL, n INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (site, amulet));
