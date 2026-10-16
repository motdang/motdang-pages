-- 2026-10-16, NaN: "a built-in way for someone like Hom to make money by adding
-- listings to home help and real estate on Motdang… Money can transfer when a
-- conversion happens, not when listing goes up. Hom's commission could be
-- mid-high, and motdang also needs a commission (can be lower)."
-- A lister brings a page in; its owner agrees the fee; a deal pays the fee by
-- PromptPay; the lister's share goes out the same day (deals.mjs).

-- listers: anyone can ask to be one; Beer says yes from LINE
ALTER TABLE seller ADD COLUMN status TEXT NOT NULL DEFAULT 'ok';   -- ok | pending | no
ALTER TABLE seller ADD COLUMN phone TEXT;
ALTER TABLE seller ADD COLUMN line TEXT;
ALTER TABLE seller ADD COLUMN promptpay TEXT;                      -- where the lister's share is sent
ALTER TABLE seller ADD COLUMN area TEXT;
ALTER TABLE seller ADD COLUMN board_hash TEXT;                     -- sha256 of the board link's token
ALTER TABLE seller ADD COLUMN deal_rate INTEGER NOT NULL DEFAULT 60;   -- lister's percent of each fee
ALTER TABLE seller ADD COLUMN deal_target INTEGER NOT NULL DEFAULT 40000; -- baht of fees a month
ALTER TABLE seller ADD COLUMN deal_closed TEXT;                    -- last month the share was worked out

-- a share is a plan sale ('plan') or a deal fee ('fee'); a fee share is paid out on the day
ALTER TABLE earn ADD COLUMN kind TEXT NOT NULL DEFAULT 'plan';
ALTER TABLE earn ADD COLUMN paid_out TEXT;

-- the owner's yes to the fee, one row per page
CREATE TABLE terms (
  site_id TEXT PRIMARY KEY,
  what TEXT NOT NULL,            -- homes | help
  trade TEXT,                    -- help: handyman maid gardener plumber electrician mover
  seller TEXT,
  name TEXT NOT NULL,            -- who agreed
  phone TEXT,
  ip_hash TEXT,
  at TEXT NOT NULL,
  ended TEXT
);

-- one deal: what closed, what the fee came to, and the payment that settles it
CREATE TABLE deal (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  listing TEXT,                  -- a listing id on the page, for homes
  seller TEXT,
  what TEXT NOT NULL,            -- rent | buy | help
  use TEXT,                      -- residential | commercial | industrial
  trade TEXT,
  basis INTEGER NOT NULL,        -- the month's rent, the price, or the job, in baht
  months INTEGER,                -- lease length, for rent
  fee INTEGER NOT NULL,
  rate INTEGER,                  -- help: the percent charged
  who TEXT,                      -- the customer, as the lister wrote it
  pay_id TEXT,
  status TEXT NOT NULL DEFAULT 'billed',  -- billed | paid | void
  at TEXT NOT NULL
);
CREATE INDEX deal_seller ON deal (seller, at);

-- help fees step on a ladder per trade, Shoup's way (deals.mjs)
CREATE TABLE fee_rate (
  trade TEXT PRIMARY KEY,
  rate INTEGER NOT NULL,
  month TEXT
);
