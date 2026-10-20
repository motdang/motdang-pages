-- A Gold code for less than a year (Nan 2026-10-20): a reader who says yes to the
-- week on Mot Dang on LINE, signed in on motdang.net, gets a Gold month for their
-- own page. motdang.net's Worker (publish/me.js) writes the row, founder '' and
-- source 'line'; /g/<code> redeems it like a founder's code.
ALTER TABLE gift ADD COLUMN months INTEGER NOT NULL DEFAULT 12;
ALTER TABLE gift ADD COLUMN source TEXT;
