-- Hotel booking counts its own months (Nan 2026-10-21: "charge hotel booking by the month").
-- A page has two dates now: gold_until, its Gold period, and hotel_until, the last day of its hotel
-- months. Booking on the page (direct room bookings, the room calendar) is on while hotel_until
-- has not passed, and in a page's first 30 Gold days; the page stays Gold when its Gold period is longer.
ALTER TABLE site ADD COLUMN hotel_until TEXT;
-- A page that has hotel booking today keeps it to the end of its current period.
UPDATE site SET hotel_until = gold_until WHERE plan = 'hotel' AND gold_until IS NOT NULL;
