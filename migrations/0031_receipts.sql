-- 2026-10-22 (Nan picked "Receipts per booking"): a receipt for each accepted booking, numbered
-- 1, 2, 3 … within its page. The number and the issue time are set the first time the receipt is opened.
ALTER TABLE booking ADD COLUMN rcpt INTEGER;
ALTER TABLE booking ADD COLUMN rcpt_at TEXT;
CREATE UNIQUE INDEX booking_rcpt ON booking (site_id, rcpt) WHERE rcpt IS NOT NULL;
