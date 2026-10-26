// kinds.mjs — the four kinds of site (Nan 2026-10-26): "Portfolio site, sell something local site, dropshipping
// site, run an online business site. Everything except for portfolio site has lots of bells and whistles."
// The variety is in the kind; a look is how it is dressed. A free page wears its own kind's looks; Gold opens
// every look ("you should be able to get any style in Gold").

import { LOOK_IDS } from './looks.mjs'

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
/** A free page's looks, by its kind of site; the first is where a page lands when Gold ends. */
export const FREE_LOOKS = {
  local: ['lanna', 'night', 'loom', 'stitch', 'clean'],
  store: ['clean', 'night', 'loom'],
  online: ['clean', 'loom', 'night'],
  portfolio: ['clean', 'stitch', 'loom'],
}
export const groupOf = (kind) => GROUP_OF[kind] || 'local'
export const freeLooks = (kind) => FREE_LOOKS[groupOf(kind)]
/** May a page of this kind wear this look? Gold: any look. */
export const lookOk = (kind, look, gold) => LOOK_IDS.includes(look) && (!!gold || freeLooks(kind).includes(look))
/** The look a page shows: the one it chose when allowed, else its kind's first free look. */
export const lookFor = (kind, look, gold) => (lookOk(kind, look, gold) ? look : freeLooks(kind)[0])
