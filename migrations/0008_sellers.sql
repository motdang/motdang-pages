-- 2026-10-15, NaN: Hom sells the plans in person, Beer manages. Hom's pay: "middle
-- high round number, fully automated, shoupified if possible." A seller earns a
-- share of each plan sold from their link (/make?by=<id>); the share moves on a
-- ladder each month with sales against the month's target (sellers.mjs).
ALTER TABLE site ADD COLUMN seller TEXT;
CREATE TABLE seller (
  id TEXT PRIMARY KEY,          -- the ?by= code
  name TEXT NOT NULL,
  rate INTEGER NOT NULL,        -- percent of the plan price
  target INTEGER NOT NULL,      -- baht of plans a month
  created TEXT NOT NULL,
  closed TEXT                   -- last month (YYYY-MM) worked out
);
CREATE TABLE earn (
  pay_id TEXT PRIMARY KEY,
  seller TEXT NOT NULL,
  site_id TEXT NOT NULL,
  baht INTEGER NOT NULL,        -- the plan price, satang tail dropped
  rate INTEGER NOT NULL,
  cut INTEGER NOT NULL,         -- baht owed to the seller
  month TEXT NOT NULL,          -- Bangkok month of the payment
  at TEXT NOT NULL
);
INSERT INTO seller (id, name, rate, target, created) VALUES ('hom', 'Hom', 20, 60000, '2026-10-15');
