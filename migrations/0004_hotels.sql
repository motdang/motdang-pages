-- 2026-10-14 (Nan: "Hotels should be able to take bookings on their motdang.net
-- site at a flat rate that significantly undercuts aggregators and booking engines").
-- A booking's total and nights, whether the hotel marked it paid, the guest's
-- reference; and other sites' taken nights per calendar address, so a room type
-- with several rooms counts each calendar as one room.

ALTER TABLE booking ADD COLUMN total TEXT;
ALTER TABLE booking ADD COLUMN nights INTEGER;
ALTER TABLE booking ADD COLUMN paid INTEGER NOT NULL DEFAULT 0;
ALTER TABLE booking ADD COLUMN ref TEXT;

CREATE TABLE blocks (
  site_id  TEXT NOT NULL,
  room     TEXT NOT NULL,
  src      TEXT NOT NULL,
  day      TEXT NOT NULL,
  PRIMARY KEY (site_id, room, src, day)
);
