-- 2026-11-17. NaN: "Move homes to Beer" (the Facebook-group home leads went to Hom from 18 Oct), then
-- "Beer doesn't need a share of the fee, she is a 51% owner of the company AND the only paid ft employee",
-- then "set it up and make it fly as hell for beer".
--
-- seller.team = 1: on the team. No share of plans or fees, no monthly statement or share step; every fee is
-- motdang's. Beer's board (/me/<token>) carries the leads below.
ALTER TABLE seller ADD COLUMN team INTEGER NOT NULL DEFAULT 0;

-- Homes for rent or sale from the Chiang Mai and Chiang Rai Facebook groups, as fb-groups/fbgroups.py reads
-- them (Mon/Wed/Fri) and posts them to /leads-in. One row per post. state: new, called, listed, no.
CREATE TABLE lead (
  id       TEXT PRIMARY KEY,   -- the post's address, hashed
  url      TEXT NOT NULL,
  posted   TEXT,               -- YYYY-MM-DD, as Facebook showed it
  grp      TEXT,               -- the group's name
  deal     TEXT,               -- rent | sale
  type     TEXT,
  place    TEXT,
  price    TEXT,               -- as the post states it
  contact  TEXT,               -- as the post prints it
  summary  TEXT,
  at       TEXT NOT NULL,      -- when it came in
  state    TEXT NOT NULL DEFAULT 'new',
  state_at TEXT,
  state_by TEXT                -- the seller who moved it
);
CREATE INDEX lead_state ON lead (state, posted);
