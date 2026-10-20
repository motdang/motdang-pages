-- 2026-10-20, NaN: "I want the actual websites of Motdang and Hongdam to do a better job featuring
-- these events. Should always be updating, and reachable easily from related motdang pages
-- (locations, calendar, associations, page owners)." events.mjs fills these every 30 minutes.

-- One row per happening still to come, from Luma, Meetup, motdang.net's harvest and people's pages.
CREATE TABLE IF NOT EXISTS ev (
  id TEXT PRIMARY KEY,          -- the source's own id: luma-evt-…, site-<page>-<n>, motdang uid
  src TEXT NOT NULL,            -- luma · meetup · motdang · site
  title TEXT NOT NULL,
  start TEXT NOT NULL,          -- UTC ISO
  end TEXT,
  all_day INTEGER DEFAULT 0,
  url TEXT,
  venue TEXT,                   -- as the source states it
  area TEXT,                    -- the neighbourhood when the host keeps the address for guests
  lat REAL, lng REAL,
  cost TEXT,                    -- Free · ฿250 · as stated
  approval INTEGER DEFAULT 0,
  spots INTEGER,
  kinds TEXT DEFAULT '',        -- space separated: tech music talk …
  host TEXT,                    -- who runs it
  host_url TEXT,
  site_id TEXT,                 -- the sites.motdang.net page it came from, or whose calendar it is
  place_href TEXT,              -- motdang.net place page, cm/p/<slug>.html
  place_name TEXT,
  feed TEXT,                    -- the ev_src key that last carried it
  seen TEXT NOT NULL            -- when a read last carried it
);
CREATE INDEX IF NOT EXISTS ev_start ON ev (start);
CREATE INDEX IF NOT EXISTS ev_site ON ev (site_id);
CREATE INDEX IF NOT EXISTS ev_place ON ev (place_href);

-- Each feed read: when, whether it answered, how many rows it gave.
CREATE TABLE IF NOT EXISTS ev_src (
  key TEXT PRIMARY KEY,         -- luma:cm · luma-cal:<id> · meetup:<group> · motdang · sites
  at TEXT, ok INTEGER, n INTEGER, note TEXT
);
