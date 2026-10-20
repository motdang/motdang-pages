// shoup.mjs — prices that follow demand on a page (NaN 2026-10-20, for the Kamthieng and
// Warorot markets). Rung's engine (../rung/src/shoup.js) on a seller's page: Donald Shoup,
// The High Cost of Free Parking, SFpark's rule. Once a week, Monday morning in Bangkok, each
// piece the seller lets move is checked:
//
//   Made things (a shop's or a food page's items): the seller says how many they can sell in
//   a month. Units sold in the last 30 days over that number: over 80%, one rung up; under
//   60%, one rung down, never under the lowest price the seller takes; between, no change.
//   Sales are what the seller marks, at the stall, in LINE or anywhere.
//
//   Amulets: one of a kind, so the batch is priced, not the piece: amulets sharing temple,
//   maker, year and mould share their asks. Asks are reserve taps on the page and the asks
//   the seller marks. Two or more in 7 days, one rung up for every open amulet of the batch;
//   a sale in the week counts as two. No ask: the price holds, unless the seller lets it come
//   down, then 14 days without an ask is one rung down, never under their lowest.
//
// Pure functions: the Worker (src/prices.mjs) and the builder read the same rules.

export const HIGH = 0.8
export const LOW = 0.6
export const WINDOW = { sold: 30, ask: 7, quiet: 14 } // days
export const TOP = 6 // rungs a price may climb above where the seller opened it

// Steps of 10–25% inside each decade (Rung's round ladder): 100, 120, 150, 180, 200, 250 …
const MANT = [10, 12, 15, 18, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90]
function build(kind) {
  const out = []
  for (let k = 0; k <= 5; k++) for (const m of MANT) out.push(m * 10 ** k)
  const round = out.filter((v) => v >= 10 && v <= 2e6)
  // 9, 19 … 99, 119, 149, 179, 199, 249 … 999, 1,199 …
  return kind === 'nine' ? round.filter((v) => v % 10 === 0).map((v) => v - 1) : round
}
export const LADDERS = { round: build('round'), nine: build('nine') }
export const ladder = (kind) => LADDERS[kind] || LADDERS.round

/** A number from a price as typed ("฿1,500", "1500 บาท"); 0 when there is none. */
export function bahtOf(p) {
  const n = Number(String(p ?? '').replace(/,/g, '').replace(/[^\d.]/g, ''))
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
}
export const fmt = (n) => new Intl.NumberFormat('en').format(n)

/** The rung nearest a price. */
export function rungOf(kind, baht) {
  const L = ladder(kind)
  let best = 0
  for (let i = 1; i < L.length; i++) if (Math.abs(L[i] - baht) < Math.abs(L[best] - baht)) best = i
  return best
}
/** The lowest rung at or above a price: the floor never sells under what the seller takes. */
export function rungAtLeast(kind, baht) {
  const L = ladder(kind)
  const i = L.findIndex((v) => v >= baht)
  return i < 0 ? L.length - 1 : i
}

/** A made thing's move: units sold in 30 days over what the seller can sell in a month (or the
 *  part of a month it has been moving, `days`). */
export function soldMove(sold, per, days = WINDOW.sold) {
  const want = per * Math.min(WINDOW.sold, Math.max(1, days)) / WINDOW.sold
  if (!(want > 0)) return { share: null, move: 0 }
  const share = sold / want
  return { share, move: share > HIGH ? 1 : share < LOW ? -1 : 0 }
}

/** An amulet batch's move. asks: in 7 days; quiet: asks in 14 days; sold: sales in 7 days. */
export function askMove({ asks = 0, quiet = 0, sold = 0, fall = false }) {
  const n = asks + 2 * sold
  if (n >= 2) return 1
  if (fall && quiet === 0 && sold === 0) return -1
  return 0
}

/** One rung from `baht` by `move`, kept between the seller's lowest and TOP rungs over the opening. */
export function step(baht, move, { kind = 'round', low = 0, open = 0 } = {}) {
  const L = ladder(kind)
  const lo = low ? rungAtLeast(kind, low) : 0
  const hi = Math.min(L.length - 1, rungOf(kind, open || baht) + TOP)
  const at = rungOf(kind, baht)
  const to = Math.min(hi, Math.max(lo, at + move))
  return L[Math.max(lo, Math.min(hi, to))]
}

/** The batch an amulet belongs to: temple, maker, year and mould when two are known, else itself. */
export function batchOf(x) {
  const parts = [x.temple, x.maker, x.year, x.mould].map((s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim())
  return parts.filter(Boolean).length >= 2 ? 'b:' + parts.join('|') : 'a:' + x.id
}

/** A piece's price settings, cleaned. on: moves; per: units a month (made things); low: lowest
 *  baht; open: where it started; fall: an amulet may come down; kind: ladder; since: the day it
 *  started moving (the server writes it). */
export function dynOf(v) {
  if (!v || typeof v !== 'object' || !v.on) return null
  const n = (x, max) => { const k = Math.round(Number(x)); return Number.isFinite(k) && k > 0 ? Math.min(max, k) : 0 }
  const since = /^\d{4}-\d{2}-\d{2}$/.test(v.since || '') ? v.since : ''
  return { on: true, per: n(v.per, 100000), low: n(v.low, 2e6), open: n(v.open, 2e6), fall: !!v.fall, kind: v.kind === 'nine' ? 'nine' : 'round', ...(since ? { since } : {}) }
}

/** Monday 06:00 in Bangkok on or after `t`: when the next check runs. */
export function nextCheck(t = Date.now()) {
  const bkk = new Date(t + 7 * 3600e3)
  const day = bkk.getUTCDay() // 0 Sunday … 1 Monday
  let add = (8 - day) % 7
  if (add === 0 && bkk.getUTCHours() >= 6) add = 7
  const d = new Date(Date.UTC(bkk.getUTCFullYear(), bkk.getUTCMonth(), bkk.getUTCDate() + add, 6) - 7 * 3600e3)
  return d
}
/** The week a check belongs to, as the Monday's date in Bangkok. */
export const weekOf = (t = Date.now()) => new Date(nextCheck(t).getTime() - 7 * 864e5 + 7 * 3600e3).toISOString().slice(0, 10)

/** What the next check does if the counts stay as they are: { move, to } for one piece. */
export function outlook(x, counts, { amulet = false, batch = null, now = null } = {}) {
  const dyn = dynOf(x.dyn)
  const baht = bahtOf(now ?? x.p)
  if (!dyn || !baht) return null
  if ((counts.days ?? 7) < 7) return { move: 0, to: baht, young: true } // a piece moves after its first full week
  let move
  if (amulet) {
    if (x.status !== 'open') return { move: 0, to: baht }
    move = askMove({ ...(batch || counts), fall: dyn.fall })
  } else move = soldMove(counts.sold || 0, dyn.per, counts.days).move
  return { move, to: step(baht, move, dyn) }
}
