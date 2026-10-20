-- 2026-10-20, NaN: "I want these to work sufficient that I can demo them at a real market" ·
-- "sign up a customer on the spot" (Kamthieng and Warorot, 3 Nov). Prices that follow demand on
-- a page (public/s/shoup.mjs, src/prices.mjs).

-- What moves a price: a sale or an ask, marked by the seller or (asks) tapped on the page.
CREATE TABLE IF NOT EXISTS mark (
  site_id TEXT NOT NULL,
  item TEXT NOT NULL,           -- an item's or an amulet's id in the page's data
  kind TEXT NOT NULL,           -- sold · ask
  qty INTEGER NOT NULL DEFAULT 1,
  src TEXT NOT NULL,            -- seller · page
  who TEXT,                     -- page asks: one a reader a day (salted hash with the day)
  at TEXT NOT NULL              -- UTC ISO
);
CREATE INDEX IF NOT EXISTS mark_site ON mark (site_id, at);
CREATE UNIQUE INDEX IF NOT EXISTS mark_once ON mark (site_id, item, kind, who) WHERE who IS NOT NULL;

-- The price each moving piece sells at now; the page's own price is where it opened.
CREATE TABLE IF NOT EXISTS price_now (
  site_id TEXT NOT NULL,
  item TEXT NOT NULL,
  baht INTEGER NOT NULL,
  at TEXT NOT NULL,
  PRIMARY KEY (site_id, item)
);

-- Each Monday's check, a row a piece; price_week says the page's check ran.
CREATE TABLE IF NOT EXISTS price_step (
  site_id TEXT NOT NULL,
  item TEXT NOT NULL,
  week TEXT NOT NULL,           -- the Monday, Bangkok date
  from_baht INTEGER NOT NULL,
  to_baht INTEGER NOT NULL,
  move INTEGER NOT NULL,
  n REAL,                       -- share sold (made things) or asks counted (amulets)
  at TEXT NOT NULL,
  PRIMARY KEY (site_id, item, week)
);
CREATE TABLE IF NOT EXISTS price_week (
  site_id TEXT NOT NULL,
  week TEXT NOT NULL,
  at TEXT NOT NULL,
  PRIMARY KEY (site_id, week)
);
