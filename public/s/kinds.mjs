// kinds.mjs — the four kinds of site (Nan 2026-10-26): "Portfolio site, sell something local site, dropshipping
// site, run an online business site. Everything except for portfolio site has lots of bells and whistles."
// The variety is in the kind: each kind of site has one design that puts first what it is for (Nan 2026-10-26).


export const GROUPS = ['local', 'store', 'online', 'portfolio']
/** Which of the four a page kind belongs to. */
export const GROUP_OF = {
  stay: 'local', service: 'local', food: 'local', shop: 'local', homes: 'local', event: 'local', amulet: 'local', group: 'local',
  store: 'store', online: 'online', work: 'portfolio', me: 'portfolio',
}
/** The page kinds inside each, in the order a maker sees them. */
export const GROUP_KINDS = {
  local: ['stay', 'service', 'food', 'shop', 'homes', 'event', 'amulet', 'group'],
  store: ['store'], online: ['online'], portfolio: ['work', 'me'],
}
export const groupOf = (kind) => GROUP_OF[kind] || 'local'
/** The one design a page wears: its kind of site's (looks.mjs). Nan 2026-10-26: "one style per kind". */
export const DESIGN_OF = { local: 'local', store: 'shop', online: 'biz', portfolio: 'folio' }
export const designOf = (kind) => DESIGN_OF[groupOf(kind)]
/** Kept for callers of the picked-look days: a page wears its kind's design, so the only look that fits is that one. */
export const freeLooks = (kind) => [designOf(kind)]
export const lookOk = (kind, look) => look === designOf(kind)
export const lookFor = (kind) => designOf(kind)
