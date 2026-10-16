-- 2026-10-16, Nan: translators are key gig work on Mot Dang. A page check (src/trcheck.mjs):
-- a translator opens a signed link, reads a Gold page's words beside the machine's, and fixes them.
-- tr_fix: a person's version of one string in one language. Keyed by the maker's words, so a fix
-- outlives the cron's re-translation and survives the maker changing other strings; path is where
-- the string last stood, which is how a fix whose words changed is found and flagged.
CREATE TABLE tr_fix (
  site_id TEXT NOT NULL,
  lang    TEXT NOT NULL,
  src     TEXT NOT NULL,
  v       TEXT NOT NULL,
  path    TEXT NOT NULL,
  who     TEXT NOT NULL,
  gig     TEXT,
  at      TEXT NOT NULL,
  PRIMARY KEY (site_id, lang, src)
);
-- gig: one page check sent out. posted when the link is made, taken the day it was first saved;
-- Paid in Art's data/gigs.tsv is read from here (tools/gigs_pull.py there).
CREATE TABLE gig (
  id      TEXT PRIMARY KEY,
  kind    TEXT NOT NULL DEFAULT 'check',
  site_id TEXT NOT NULL,
  lang    TEXT NOT NULL,
  who     TEXT,
  posted  TEXT NOT NULL,
  taken   TEXT,
  saved   TEXT,
  n       INTEGER NOT NULL DEFAULT 0,
  changed INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX gig_site ON gig (site_id, lang);
