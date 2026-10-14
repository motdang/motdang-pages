-- 2026-10-14, Nan: hotels pay ฿555 a month ("555/month"). A payment carries the
-- months it buys: 12 for the Gold year, 1 for a hotel month.
ALTER TABLE pay ADD COLUMN months INTEGER NOT NULL DEFAULT 12;
