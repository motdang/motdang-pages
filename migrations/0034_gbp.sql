-- 2026-10-22, NaN: a Gold page kept in step with the owner's Google Business Profile (src/gbp.mjs).
-- One row per page that connected. The refresh token is sealed with the GBP_KEY secret (AES-GCM) and is never read back to the browser.
CREATE TABLE IF NOT EXISTS gbp (
  site_id TEXT PRIMARY KEY,
  enc TEXT NOT NULL,          -- iv.ciphertext of the refresh token, base64url
  account TEXT,               -- accounts/123, the account the picked location sits under
  location TEXT,              -- locations/456, the picked location (null until the owner picks)
  loc_title TEXT,             -- its name as Google shows it
  connected TEXT NOT NULL,
  last_try TEXT,              -- the last sync that ran
  last_ok TEXT,               -- the last sync that sent everything it had
  err TEXT,                   -- code|Google's words, empty when the last sync went through
  sent TEXT                   -- JSON: what was last sent (hashes of hours, description, phone, link; photos; posts)
);
