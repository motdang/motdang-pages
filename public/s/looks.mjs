// looks.mjs — how a page looks: one design for each kind of site, and nothing to pick (Nan 2026-10-26:
// "Too much repetition. Styles should be FUNCTIONAL, design should have PURPOSE, one style per kind."
// · "decorations should DO THINGS"). Each design puts first what its kind of site is for:
//   local  sell something local: open now, the main action, the way there
//   shop   an online shop: the products and the cart
//   biz    an online business: the promise, the packages, the proof
//   folio  a portfolio: the work
// The owner's colour is the one choice left; the rest follows from the kind (kinds.mjs designOf).

export const F_THAI = '"Prompt","Noto Sans Thai","Leelawadee UI","Thonburi",Tahoma'
export const LOOK_IDS = ['local', 'shop', 'biz', 'folio']
export const GOLD_LOOKS = []
// the seven picked looks of 2026-10-15 to 2026-10-26: a page that had one shows its kind's design
export const LOOK_ALIAS = { poster: 'local', loom: 'local', stitch: 'local', night: 'local', lanna: 'local', clean: 'local', gold: 'local', y1997: 'local', riso: 'local' }
export const lookOf = (id) => LOOK_ALIAS[id] || (LOOK_IDS.includes(id) ? id : 'local')

const SANS = `system-ui,-apple-system,"Segoe UI",Roboto,${F_THAI},sans-serif`
const vars = (bg, card, ink, mute, line) => `--bg:${bg};--card:${card};--ink:${ink};--mute:${mute};--line:${line};--hero:${line};--r:16px;--em:.56;
  --display:"Prompt",${SANS};--body:${SANS};--case:none;--h1w:700;--track:-.02em`

// sell something local: warm paper, each part a card; the hours table marks today; the map card shows what to look for
const LOCAL = `.wrap>section.card,.wrap>.card{border-radius:18px;background:var(--card);box-shadow:0 1px 0 var(--line),0 6px 22px rgba(28,23,36,.05)}
.hours tr.today td{font-weight:700;color:var(--ink)}.hours tr.today td:first-child::before{content:"";display:inline-block;width:9px;height:9px;margin-right:8px;border-radius:50%;background:var(--accent)}
.mapcard .lookfor{display:grid;grid-template-columns:132px 1fr;gap:14px;align-items:center;margin:0 0 14px}.mapcard .lookfor canvas{width:132px;height:110px;border-radius:14px;background:var(--line)}
.mapcard .lookfor p{margin:0;font-size:16px;line-height:1.4;color:var(--mute)}`

// an online shop: the shelf first, square pictures, the price loud; the cart bar does the rest
const SHOP = `.top .pf{height:clamp(160px,28vh,300px)}
.top .t{padding-bottom:18px}
.wrap>section.card,.wrap>.card{border-radius:0;background:none;box-shadow:none;border-top:1px solid var(--line);padding-left:2px;padding-right:2px}
.wrap>section#shop{border-top:0}`

// an online business: the promise in large type, two buttons, the packages side by side, the proof under them
const BIZ = `.top .tag{font-size:clamp(21px,5.4cqi,28px);line-height:1.3;color:var(--ink);font-weight:600}
.top h1{font-size:clamp(24px,6cqi,34px);color:var(--mute)}
.wrap>section.card,.wrap>.card{border-radius:0;background:none;box-shadow:none;border-top:1px solid var(--line)}
.wrap>#packages{background:var(--card);border-radius:20px;border-top:0;padding:22px 16px}`

// a portfolio: the work edge to edge, the rest out of its way
const FOLIO = `.top{text-align:center}.top .t{display:flex;flex-direction:column;align-items:center}
.top .av{margin:0 auto 12px}.top .tag{margin-left:auto;margin-right:auto}
.wrap>section.card,.wrap>.card{border-radius:0;background:none;box-shadow:none;border-top:1px solid var(--line)}
.wrap>#works{border-top:0}#works .wgrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}@media (min-width:700px){#works .wgrid{grid-template-columns:repeat(3,minmax(0,1fr))}}
#works .wcard figure{border-radius:6px}`

export const LOOKS = {
  local: { label: 'Local', fonts: ['Prompt'], accent: '#d7261e', vars: vars('#faf7f2', '#ffffff', '#1c1724', '#5c5567', '#ebe4da'), css: LOCAL, art: '' },
  shop: { label: 'Online shop', fonts: ['Prompt'], accent: '#0e7a59', vars: vars('#ffffff', '#ffffff', '#14161a', '#575e6c', '#e6e8ec'), css: SHOP, art: '' },
  biz: { label: 'Online business', fonts: ['Prompt'], accent: '#2453d6', vars: vars('#ffffff', '#f4f6fb', '#121726', '#56607a', '#e3e8f2'), css: BIZ, art: '' },
  folio: { label: 'Portfolio', fonts: ['Prompt'], accent: '#16131f', vars: vars('#ffffff', '#ffffff', '#16131f', '#615c6b', '#ebe9ee'), css: FOLIO, art: '' },
}

// What every design shares: the photo as taken, a sheet of words over its foot, the open-now line, one main
// button; then a bar of the page's parts to jump to, and a dock of the actions that stays in reach.
export const HERO_CSS = `.top{position:relative;overflow:hidden;color:var(--ink);container-type:inline-size;isolation:isolate;display:flex;flex-direction:column;background:var(--bg)}
.top .pf{position:relative;flex:none;height:clamp(220px,44vh,460px)}
.top .ph{position:absolute;inset:0;overflow:hidden;clip-path:inset(0);background:var(--hero)}
.top .ph>img{position:fixed;inset:0;width:100%;height:100vh;height:100lvh;object-fit:cover}
.top .t{position:relative;z-index:3;width:100%;max-width:760px;margin:0 auto;padding:26px 18px 26px;background:var(--bg)}
.top.has-cover .t{margin-top:-24px;border-radius:24px 24px 0 0}
.top h1{margin:0;font-family:var(--display);font-weight:var(--h1w);font-size:min(clamp(32px,9cqi,56px),calc((100cqi - 40px) / (var(--lw,8) * var(--em,.56))));line-height:1.05;letter-spacing:var(--track);overflow-wrap:break-word;text-wrap:balance}
.top h1.th{letter-spacing:0;line-height:1.2}
.top h1 .w{display:inline-block}
.kick{margin:0 0 8px;font:600 14px/1.4 var(--body);color:var(--mute)}.kick a{color:inherit;text-decoration:none}.kick a::after{content:" →"}
.top .tag{margin:10px 0 0;font-size:clamp(17px,4.6cqi,20px);line-height:1.4;max-width:32em;color:var(--mute)}
.top .bar,.dings{display:none}
.badge{margin-top:14px}
.top .cta,.top .ctas{margin-top:18px}.top .ctas{display:grid;gap:10px}
.top .cr{position:absolute;right:10px;bottom:30px;z-index:4;margin:0;max-width:calc(100% - 20px);font-size:10.5px;line-height:1.3;color:#fff;opacity:.8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 2px #000,0 0 6px #000}
.top .cr a{color:inherit}
.seal{display:none}
.tshare,.tlang{position:absolute;right:12px;top:12px;z-index:8;display:grid;place-items:center;width:44px;height:44px;padding:0;border:0;border-radius:50%;background:rgba(255,255,255,.92);color:#16131f;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.18)}
.tshare:active{transform:scale(.92)}.tshare .i{width:21px;height:21px}
.tlang{right:64px;grid-template-columns:auto auto;gap:3px;width:auto;min-width:44px;padding:0 10px 0 9px;font:600 12px/1 var(--body);letter-spacing:.04em;text-transform:uppercase}.tlang .i{width:19px;height:19px}.tlang select{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
.top:not(.has-cover) .tshare,.top:not(.has-cover) .tlang{box-shadow:0 0 0 1px var(--line)}
.wrap>section.card h2,.wrap>.card h2{font:700 21px/1.25 var(--display);letter-spacing:0;text-transform:none;color:var(--ink);margin:0 0 14px}
.wrap>section.card h2 svg,.wrap>section.card h2 [data-dingbat]{display:none}
.tabs{position:sticky;top:0;z-index:20;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:10px 16px;background:color-mix(in srgb,var(--bg) 92%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
.tabs::-webkit-scrollbar{display:none}
.tabs a{flex:none;padding:8px 14px;border-radius:99px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line);font:600 15px/1.2 var(--body);text-decoration:none;color:var(--ink)}
.tabs a.on{background:var(--ink);color:var(--bg);box-shadow:none}
.dock{position:fixed;left:0;right:0;bottom:0;z-index:30;display:flex;gap:8px;justify-content:center;padding:10px 12px calc(10px + env(safe-area-inset-bottom));background:color-mix(in srgb,var(--bg) 94%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);box-shadow:0 -1px 0 var(--line);transition:transform .25s}
.dock.off{transform:translateY(110%)}
.dock a{flex:1 1 0;max-width:180px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 6px;border-radius:14px;font:600 13px/1.15 var(--body);text-decoration:none;color:var(--ink);text-align:center}
.dock a .i{width:24px;height:24px}
.dock a.main{background:var(--accent);color:var(--on-accent)}
body:has(.dock){padding-bottom:84px}
section.desk{display:none}@media (min-width:900px){section.desk{display:block}}
.drawn figcaption{font:600 15px/1.3 var(--body);color:var(--mute)}
@keyframes grow{from{transform:scaleX(0)}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}`
