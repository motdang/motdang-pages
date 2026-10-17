-- 2026-10-17, NaN: "I have lots of distant spectators looking to support motdang, either
-- thru simply using the product, voluneership, paid contributions, or investment. Create a
-- portal that allows all these actions, distinct from tasking platform."
-- /support (support.mjs). A volunteer's sign-up or an investor's note is a backer row.
CREATE TABLE backer (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,            -- volunteer · invest
  name TEXT NOT NULL,
  contact TEXT NOT NULL,         -- email, LINE or phone
  place TEXT,                    -- where they are
  what TEXT,                     -- volunteer: the kinds of help, comma-separated; invest: the amount in baht
  langs TEXT,                    -- volunteer: languages they translate
  hours TEXT,                    -- volunteer: hours a week
  note TEXT,
  lang TEXT,                     -- the page's language when they sent it
  made TEXT NOT NULL,
  told TEXT                      -- where the team heard: discord, mail, or both
);
CREATE INDEX backer_kind ON backer (kind, made);
