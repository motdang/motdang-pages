-- 2026-10-16, NaN: "There will always be work for people like Hom (freelance sales and
-- community ambassadors). Let's create a workflow for publishing that work and
-- attracting/recruiting more Homs. They help us get paid, and we pay them automagically."
-- /sell takes sign-ups; Beer says yes from a link; each seller gets a kit page; the 1st
-- of the month writes a payout per seller with a PromptPay QR for Beer (sellers.mjs, sell.mjs).
-- status, phone, LINE, PromptPay and area came with 0010 (listers, deals.mjs).
ALTER TABLE seller ADD COLUMN langs TEXT;
ALTER TABLE seller ADD COLUMN lang TEXT;     -- the kit's language: en · th · my
ALTER TABLE seller ADD COLUMN via TEXT;      -- the seller who brought them
ALTER TABLE seller ADD COLUMN key TEXT;      -- changes to cancel the kit link
CREATE TABLE payout (
  id TEXT PRIMARY KEY,
  seller TEXT NOT NULL,
  month TEXT NOT NULL,          -- the month worked (YYYY-MM)
  baht INTEGER NOT NULL,
  status TEXT NOT NULL,         -- due · paid
  at TEXT NOT NULL,
  paid_at TEXT,
  UNIQUE (seller, month)
);
UPDATE seller SET key = lower(hex(randomblob(10))), lang = 'my' WHERE id = 'hom';
