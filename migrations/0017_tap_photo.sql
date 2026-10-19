-- 2026-10-19, NaN: "more magical for the recipient": a tap card carries a picture (R2 tap/<id>.jpg).
ALTER TABLE tap ADD COLUMN photo TEXT; -- a short version string; empty when the card has none
