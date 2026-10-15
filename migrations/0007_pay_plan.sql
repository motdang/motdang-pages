-- 2026-10-15: the hotel year paid up front buys 12 months like the Gold year,
-- so a payment carries its plan as well as its months. Older rows: NULL, read
-- as before (1 month = hotel, 12 = gold).
ALTER TABLE pay ADD COLUMN plan TEXT;
