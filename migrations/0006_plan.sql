-- 2026-10-14, Nan: "Add buttons for the standard gold page to add a link to your
-- agoda or booking.com page, but not direct bookings." Which Gold a page paid for:
-- gold (the year, links to Agoda and Booking.com) or hotel (the month, direct bookings).
ALTER TABLE site ADD COLUMN plan TEXT NOT NULL DEFAULT 'gold';
