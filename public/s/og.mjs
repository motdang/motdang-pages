// og.mjs — which card a page or an item page shows, and the key that changes when the card would.
// NaN 2026-10-20: "All sites made by me and all 'gold' level sites should include unique share cards."
// The worker serves /card/<name>[/<t>/<id>].jpg (src/ogcard.mjs).

const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) } return (h >>> 0).toString(36) }

/** What one card shows. t = 'a' | 'w' | 'l' with its item x, or '' for the page itself. */
export function ogOf(site, d, t = '', x = null) {
  const name = d.name || site.name
  const gold = site.tier === 'gold'
  const photo = x ? (Array.isArray(x.photos) && x.photos[0]) || '' : d.cover || ''
  const path = x ? `${site.name}/${t}/${x.id}` : site.name
  const o = { t, id: x ? x.id : '', path, title: x ? String(x.t || name) : name, tagline: x ? name : d.tagline || '', photo, gold,
    look: site.look, accent: d.accent || '', avatar: d.avatar || '', round: d.avround, dings: d.dings || [] }
  o.key = fnv(JSON.stringify([o.title, o.tagline, o.photo, o.gold, o.look, o.accent, o.avatar, o.round, o.dings, path, x ? 0 : d.drawing ? d.scene || site.kind : '']))
  return o
}
