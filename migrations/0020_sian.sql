-- Sala Sian (src/sian.mjs): each month's price and seats; the price steps on the month before
CREATE TABLE IF NOT EXISTS sian_month (
  month TEXT PRIMARY KEY,   -- YYYY-MM, Bangkok
  price INTEGER NOT NULL,   -- baht a year
  seats INTEGER NOT NULL
);
