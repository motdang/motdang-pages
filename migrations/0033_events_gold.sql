-- 2026-10-22, NaN: Gold pages' events in motdang.net's general events lists and the weekly issue.
-- A row from a Gold page carries a gold mark and the page's share card; ordering puts Gold first at the same minute.
ALTER TABLE ev ADD COLUMN gold INTEGER DEFAULT 0;
ALTER TABLE ev ADD COLUMN card TEXT;       -- the page's share card address, for a Gold page's row
CREATE INDEX IF NOT EXISTS ev_gold ON ev (gold, start);
