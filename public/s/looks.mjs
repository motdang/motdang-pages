// looks.mjs — how a page looks. Seven looks, each its own page, not one page in seven colours
// (Nan 2026-10-15: "I can't really tell the difference between any of the designs, they do nothing
// and all suck equally" · "Nobody said you need 9 of everything. Prune what isn't good or useful.").
// Started from the minisites she rates best: Golden Gate and Mae Hong Son (poster), Warp and Weft
// (loom), Lanna Craft (lanna); stitch is her bright-pages rule for Akha and Hmong readers.
//
// A look gives: palette and type (vars), its own CSS, the drawing that answers a tap (art), and
// deco(ctx) → { back, ph, frame, front, under }: markup behind the photo, inside it, around it,
// over the page top, and under the header. Every look moves on its own; none needs a script.

export const F_THAI = '"Prompt","Noto Sans Thai","Leelawadee UI","Thonburi",Tahoma'
export const LOOK_IDS = ['poster', 'loom', 'stitch', 'night', 'lanna', 'clean', 'gold']
export const GOLD_LOOKS = ['gold']
// looks taken out on 2026-10-15: a page that had one shows the nearest look that stayed
export const LOOK_ALIAS = { y1997: 'night', riso: 'poster' }
export const lookOf = (id) => LOOK_ALIAS[id] || (LOOK_IDS.includes(id) ? id : 'poster')

const enc = (svg) => `url("data:image/svg+xml,${svg.replace(/"/g, "'").replace(/#/g, '%23').replace(/</g, '%3C').replace(/>/g, '%3E').replace(/\s+/g, ' ')}")`

// Cross-stitch from a grid of letters: each cell an X of two threads, the way the Akha and Hmong
// bands are sewn. '.' is cloth.
function xstitch(rows, colours, cell = 4) {
  const h = rows.length, w = rows[0].length
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * cell}" height="${h * cell}">`
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    const c = colours[ch]
    if (!c) return
    const a = x * cell + 0.6, b = y * cell + 0.6, e = cell - 1.2
    s += `<path d="M${a} ${b}l${e} ${e}M${a + e} ${b}l${-e} ${e}" stroke="${c}" stroke-width="${cell * 0.42}" stroke-linecap="round"/>`
  }))
  return s + '</svg>'
}

// Woven pixels: each cell a little raised square of thread.
function woven(rows, colours, cell = 4) {
  const h = rows.length, w = rows[0].length
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${w * cell}" height="${h * cell}"><rect width="100%" height="100%" fill="#2a1a10"/>`
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    const c = colours[ch]
    if (c) s += `<rect x="${x * cell + 0.4}" y="${y * cell + 0.4}" width="${cell - 0.8}" height="${cell - 0.8}" rx="0.8" fill="${c}"/>`
  }))
  return s + '</svg>'
}

const AKHA = [
  '.....P...........P......',
  '....PYP.........PYP.....',
  '...PYGYP...W...PYGYP....',
  '..PYGWGYP.WPW.PYGWGYP...',
  '.PYGWPWGYPWPWPYGWPWGYP..',
  '..PYGWGYP.WPW.PYGWGYP...',
  '...PYGYP...W...PYGYP....',
  '....PYP.........PYP.....',
  '.....P...........P......',
]
const AKHA_C = { P: '#ff2e88', Y: '#ffd400', G: '#19c37d', W: '#ffffff' }

const ELEPHANTS = [
  '..............................',
  '..GGGGGG...........R..........',
  '.GGGGGGGG.........RTR.........',
  'GGGGGGGGGG.......RTTTR........',
  'GGGGGGGGGGGG....RTTTTTR.......',
  'G.GGGGGGGGGG.....RTTTR........',
  'G.GGGGGGGGGG......RTR.........',
  'G.GG..GG..GG.......R..........',
  '..GG..GG..GG..................',
  '..............................',
]
const LOOM_C = { G: '#e0a83e', R: '#c24a82', T: '#3aa197' }

// ---- the looks ---------------------------------------------------------------------------------

export const LOOKS = {
  // Golden Gate and Mae Hong Son: the photo printed in two inks, a slab of huge condensed capitals
  poster: {
    label: 'Poster', fonts: ['Prompt'], accent: '#ff5a1f',
    vars: `--bg:#16121f;--card:#211a2e;--ink:#fff4e0;--mute:#cfc3dc;--line:#3b3150;--hero:#16121f;--r:4px;--em:.5;
      --display:"Avenir Next Condensed","HelveticaNeue-CondensedBlack","HelveticaNeue-CondensedBold","Arial Narrow Bold","Franklin Gothic Heavy",Impact,${F_THAI},sans-serif;
      --body:"Avenir Next",Avenir,"Segoe UI",system-ui,-apple-system,Helvetica,Arial,${F_THAI},sans-serif;--case:uppercase;--h1w:800;--track:0`,
    css: `.top{display:flex;flex-direction:column;background:var(--bg)}
      .top .pf{height:min(58vh,520px);min-height:290px;clip-path:polygon(0 0,100% 0,100% 84%,0 100%)}
      .top .ph>img{filter:grayscale(1) brightness(1.22) contrast(1.4);animation:drift 26s ease-in-out infinite alternate}
      .top .ph::before{content:"";position:absolute;inset:0;z-index:1;background:var(--accent);mix-blend-mode:multiply}
      .top .ph::after{content:"";position:absolute;inset:0;z-index:1;background:#1c1530;mix-blend-mode:lighten}
      .top .cr{bottom:calc(16% + 6px)}
      .top .t{padding:4px 18px 30px}
      .top h1{color:var(--ink);font-stretch:condensed;font-size:min(clamp(52px,16cqi,132px),calc((100cqi - 36px) / (var(--lw,8) * var(--em))));line-height:.88}
      .top h1.th{font-family:${F_THAI};font-weight:600;line-height:1.08;--em:.62}
      .top h1 .w{animation:slam .75s cubic-bezier(.2,1.5,.35,1) both;animation-delay:calc(var(--i) * 110ms + .15s)}
      .top.go h1 .w{animation:slam2 .6s cubic-bezier(.2,1.5,.35,1) both;animation-delay:calc(var(--i) * 80ms)}@keyframes slam2{0%{transform:translateY(.3em) scale(1.3) rotate(4deg);opacity:0}100%{transform:none;opacity:1}}
      @keyframes slam{0%{opacity:0;transform:translateY(.3em) scale(1.4) rotate(-4deg)}55%{opacity:1}100%{opacity:1;transform:none}}
      .top .bar{display:block;width:104px;height:11px;margin:16px 0 2px;background:var(--accent);transform-origin:left;animation:grow .6s .75s cubic-bezier(.2,.9,.2,1) both}
      .top .tag{color:#e8dcc8}
      .badge{border-radius:3px;background:transparent;color:var(--ink);box-shadow:inset 0 0 0 2px #fff4e04d;text-transform:uppercase;letter-spacing:.09em;font-size:13px;font-weight:700}
      .badge.open{background:#19c37d;color:#04140c;box-shadow:none}
      .card{border:2px solid var(--line);border-radius:4px}
      .card h2{flex-wrap:wrap;font:800 30px/1 var(--display);font-stretch:condensed;letter-spacing:.01em;text-transform:uppercase;color:var(--ink)}
      .card h2::after{content:"";flex-basis:100%;height:0;margin-top:2px;border-top:6px solid var(--accent);max-width:46px}
      .btn{border-radius:3px;text-transform:uppercase;letter-spacing:.05em;font-family:var(--display);font-stretch:condensed;font-weight:800;font-size:19px;box-shadow:4px 4px 0 #000}
      .btn.dark{background:var(--ink);color:#16121f}.btn.ghost{box-shadow:inset 0 0 0 2px currentColor,4px 4px 0 #000}
      .menu .p{font:800 27px/1 var(--display);font-stretch:condensed;color:var(--acc-ink)}
      .tshare{border:0;border-radius:3px;background:var(--accent);color:var(--on-accent);box-shadow:3px 3px 0 #000;-webkit-backdrop-filter:none;backdrop-filter:none}
      .calz .dt{border-radius:3px}`,
    art: '',
  },

  // Warp and Weft: a woven band, the photo weaving itself open, a serif on dark wood
  loom: {
    label: 'Loom', fonts: ['Chonburi'], accent: '#e0a83e',
    vars: `--bg:#1f150e;--card:#2a1d13;--ink:#f6ead5;--mute:#d5c0a2;--line:#4d3725;--hero:#1f150e;--r:6px;--em:.58;
      --display:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,"Chonburi",serif;
      --body:"Avenir Next",Avenir,"Segoe UI",system-ui,-apple-system,${F_THAI},sans-serif;--case:none;--h1w:700;--track:-.01em`,
    css: `body{background-image:repeating-linear-gradient(90deg,rgba(255,236,200,.025) 0 1px,transparent 1px 6px)}
      .top{display:flex;flex-direction:column;background:transparent}
      .band{height:40px;background:${enc(woven(ELEPHANTS, LOOM_C))} 0 0/120px 40px repeat-x;border-bottom:3px solid #7a5a2e;
        -webkit-mask:linear-gradient(#000,#000) 0 0/100% 0 no-repeat;mask:linear-gradient(#000,#000) 0 0/100% 0 no-repeat;animation:picks 1.4s .2s steps(10) forwards,bandslide 30s linear infinite}
      @keyframes picks{to{-webkit-mask-size:100% 100%;mask-size:100% 100%}}@keyframes bandslide{to{background-position:-240px 0}}
      .top .pf{margin:18px 16px 0;height:min(50vh,440px);min-height:250px;box-shadow:0 0 0 1px #8a6635,0 0 0 7px #1f150e,0 0 0 8px #8a6635,0 26px 40px -16px #000}
      .top .ph>img{filter:sepia(.18) saturate(1.08) contrast(1.04)}
      .ph .warp{position:absolute;inset:0;z-index:1;pointer-events:none;opacity:.5;background:repeating-linear-gradient(90deg,rgba(255,240,210,.07) 0 1px,transparent 1px 3px),repeating-linear-gradient(0deg,rgba(40,20,0,.07) 0 1px,transparent 1px 3px)}
      .ph .weft{position:absolute;inset:0;z-index:2;display:grid;grid-template-rows:repeat(12,1fr);pointer-events:none}
      .ph .weft i{display:block;background:repeating-linear-gradient(90deg,#b97a1c 0 3px,#7e5113 3px 5px,#d6a04a 5px 7px);animation:open .85s cubic-bezier(.7,0,.25,1) both;animation-delay:calc(var(--i) * 50ms + .25s)}
      .ph .weft i:nth-child(odd){--dx:-101%}.ph .weft i:nth-child(even){--dx:101%;background:repeating-linear-gradient(90deg,#3aa197 0 3px,#1f6e66 3px 5px,#e0a83e 5px 7px)}
      @keyframes open{to{transform:translateX(var(--dx))}}
      .top.go .weft i{animation-name:reweave;animation-delay:calc(var(--i) * 40ms)}@keyframes reweave{0%{transform:none}35%{transform:none}100%{transform:translateX(var(--dx))}}
      .top .t{padding:24px 20px 30px}
      .top h1{color:var(--ink);line-height:1.02}
      .top h1 .w{animation:wordup .9s cubic-bezier(.2,.8,.2,1) both;animation-delay:calc(var(--i) * 120ms + .9s)}
      .top .tag{font-family:var(--display);font-style:italic;color:#e9c98f}
      .top .bar{display:block;width:150px;height:9px;margin:18px 0 0;background:repeating-linear-gradient(90deg,#b97a1c 0 8px,#3aa197 8px 16px,#c24a82 16px 24px,#f6ead5 24px 26px);border-radius:2px}
      .badge,.badge.open{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1px #8a6635;border-radius:4px}
      .badge.open{color:#9fe7bd;box-shadow:inset 0 0 0 1px #2f7a52}

      .card{position:relative;overflow:hidden;padding-top:36px;border:1px solid #5a4126}
      .card::before{content:"";position:absolute;left:0;right:0;top:0;height:12px;background:${enc(woven(['GGRRTTGGRRTT', 'GRRTTGGRRTTG', 'RRTTGGRRTTGG'], LOOM_C, 4))} 0 0/48px 12px repeat-x}
      .card h2{font:italic 700 27px/1.1 var(--display);color:var(--acc-ink);letter-spacing:0;text-transform:none}
      .menu .p{font:700 22px/1 var(--display);color:var(--acc-ink)}
      .btn.dark{background:var(--ink);color:#1f150e}
      .tshare{top:52px;border-color:#8a6635;background:#1f150ecc;color:#e0a83e}`,
    art: '',
    deco: () => ({
      back: '<div class="band" aria-hidden="true"></div>',
      ph: `<span class="warp"></span><span class="weft">${Array.from({ length: 12 }, (_, i) => `<i style="--i:${i}"></i>`).join('')}</span>`,
    }),
  },

  // Her bright-pages rule: indigo cloth, Akha cross-stitch bands, a sewn-on photo, a yellow name tag
  stitch: {
    label: 'Stitch', fonts: ['Sriracha', 'Prompt'], accent: '#ff2e88',
    vars: `--bg:#23287a;--card:#fffaf0;--ink:#1b1f5e;--mute:#45487a;--line:#d9d6ef;--hero:#23287a;--r:22px;--em:.6;
      --display:"Sriracha","Chalkboard SE","Comic Sans MS",${F_THAI},cursive;--body:"Prompt",system-ui,-apple-system,"Segoe UI",${F_THAI},sans-serif;
      --case:none;--h1w:400;--track:0`,
    css: `body{color:#fff}
      .ribbon{height:36px;background:${enc(xstitch(AKHA, AKHA_C))} 0 0/96px 36px repeat-x;animation:ribbon 9s linear infinite}
      .ribbon.b{animation-direction:reverse;margin-top:8px}
      @keyframes ribbon{to{background-position:96px 0}}
      .top{color:#fff;background:transparent;padding-bottom:4px}
      .top .pf{margin:22px 20px 0;height:min(46vh,420px);min-height:240px;transform:rotate(-2deg);border-radius:24px;box-shadow:0 0 0 7px #fff,11px 13px 0 7px #ff2e88}
      .top .ph{border-radius:24px}.top .ph>img{position:absolute;height:100%}
      .sew{position:absolute;inset:11px;z-index:2;width:calc(100% - 22px);height:calc(100% - 22px);overflow:visible;pointer-events:none}
      .sew .draw{stroke-dasharray:1000;stroke-dashoffset:1000;animation:sew 2.4s .4s ease-in-out forwards}@keyframes sew{to{stroke-dashoffset:0}}
      
      .top .cr{top:14px;bottom:auto;left:18px;right:auto;max-width:62%}
      .top .t{display:flex;flex-direction:column;align-items:flex-start;padding:0 20px 24px;margin-top:-30px;z-index:4}
      .top.gilt:not(.has-cover)>.t{margin-top:0;padding-top:58px}.top:not(.has-cover)>.t{margin-top:0;padding-top:24px}
      .top h1{order:1}.kick{order:2;margin:20px 0 0}.top .tag{order:3}.dings{order:4}#st{order:5}.top .cta{order:6}
      .top.go h1{animation:pop2 .6s cubic-bezier(.2,1.6,.4,1) both}@keyframes pop2{0%{transform:rotate(-4deg) scale(.7)}100%{transform:rotate(1.6deg) scale(1)}}
      .top h1{display:inline-block;max-width:100%;padding:10px 20px 14px;background:#ffd400;color:#1b1f5e;border-radius:18px;transform:rotate(1.6deg);box-shadow:7px 7px 0 #ff2e88;outline:2px dashed #1b1f5e66;outline-offset:-8px;
        font-size:min(clamp(36px,10.5cqi,72px),calc((100cqi - 80px) / (var(--lw,8) * var(--em))));line-height:1.12;animation:pop .7s .3s cubic-bezier(.2,1.6,.4,1) both}
      @keyframes pop{0%{transform:rotate(1.6deg) scale(.4);opacity:0}100%{transform:rotate(1.6deg) scale(1);opacity:1}}
      .top .tag{color:#fff;margin-top:6px;font-weight:600}
      .kick{color:#ffd400}
      .badge{background:#fff;color:#1b1f5e;border:3px solid #1b1f5e;box-shadow:4px 4px 0 #19c37d;font-weight:700}
      .badge.open{background:#19c37d;color:#04140c;box-shadow:4px 4px 0 #ffd400}
      .hearts i{position:absolute;z-index:3;width:22px;height:20px;background:#ff2e88;clip-path:path("M11 19C4 13 0 9.5 0 5.5 0 2.5 2.4 0 5.4 0 7.4 0 9.6 1.3 11 3.4 12.4 1.3 14.6 0 16.6 0 19.6 0 22 2.5 22 5.5 22 9.5 18 13 11 19Z");animation:hfloat 4.5s ease-in-out infinite;opacity:.95}
      .hearts i:nth-child(2){background:#ffd400;width:16px;height:15px;clip-path:path("M8 14C3 9.6 0 7 0 4 0 1.8 1.8 0 4 0 5.5 0 7 .9 8 2.4 9 .9 10.5 0 12 0 14.2 0 16 1.8 16 4 16 7 13 9.6 8 14Z");animation-delay:-1.5s}
      .hearts i:nth-child(3){background:#19c37d;animation-delay:-3s}
      @keyframes hfloat{50%{transform:translateY(-14px) rotate(-8deg)}}
      .card{border:4px solid #1b1f5e;box-shadow:8px 8px 0 #ff2e88;outline:2px dashed #ff2e8855;outline-offset:-12px}
      .card h2{font:400 28px/1.15 var(--display);color:#e0156d;letter-spacing:0;text-transform:none}
      main>.card+.card{margin-top:62px}main>.card+.card::before{content:"";display:block;height:36px;margin:-66px -26px 30px;background:${enc(xstitch(AKHA, AKHA_C))} center/96px 36px repeat-x}
      .btn{border-radius:99px;border:3px solid #1b1f5e;box-shadow:4px 4px 0 #1b1f5e;font-weight:700}
      .btn.dark{background:#ffd400;color:#1b1f5e}
      .menu .p{font:800 22px/1 var(--body);color:#e0156d}
      .foot{color:#fff}.foot a{color:#ffd400}.share,.credits{color:var(--ink)}
      .tshare{top:46px;background:#fff;color:#1b1f5e;border:3px solid #1b1f5e;box-shadow:3px 3px 0 #ff2e88;-webkit-backdrop-filter:none;backdrop-filter:none}`,
    art: '',
    deco: () => ({
      back: '<div class="ribbon" aria-hidden="true"></div>',
      ph: '<svg class="sew" aria-hidden="true"><defs><mask id="sewm"><rect class="draw" x="0" y="0" width="100%" height="100%" rx="14" pathLength="1000" fill="none" stroke="#fff" stroke-width="8"/></mask></defs><rect x="0" y="0" width="100%" height="100%" rx="14" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="9 7" stroke-linecap="round" mask="url(#sewm)"/></svg>',
      front: '<span class="hearts" aria-hidden="true"><i style="left:8%;top:30%"></i><i style="left:86%;top:48%"></i><i style="left:12%;top:62%"></i></span>',
      under: '<div class="ribbon b" aria-hidden="true"></div>',
    }),
  },

  // A night market: the photo after dark, lights strung over it, lanterns going up, the name in neon
  night: {
    label: 'Night market', fonts: ['Prompt'], accent: '#ff4fa3',
    vars: `--bg:#0b0d26;--card:#141838;--ink:#fdf6ff;--mute:#c8c4ea;--line:#2e336e;--hero:#0b0d26;--r:14px;--em:.6;
      --display:"Prompt","Avenir Next",system-ui,${F_THAI},sans-serif;--body:"Prompt",system-ui,-apple-system,"Segoe UI",${F_THAI},sans-serif;
      --case:none;--h1w:600;--track:-.01em`,
    css: `.top{min-height:min(82vh,700px);display:flex;flex-direction:column;justify-content:flex-end;text-align:center;color:#fff;background:var(--bg)}
      .top .pf{position:absolute;inset:0}
      .top .ph>img{filter:brightness(.52) saturate(1.3) contrast(1.06);animation:drift 30s ease-in-out infinite alternate}
      .top .ph::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,#0b0d26f0 0%,#0b0d2650 26%,#0b0d2626 52%,#0b0d26 100%)}
      .bokeh{position:absolute;inset:0;z-index:1;pointer-events:none;filter:blur(5px);opacity:.75;background:
        radial-gradient(circle at 14% 58%,#ffb54a66 0 9px,transparent 10px),radial-gradient(circle at 82% 46%,#ff4fa355 0 13px,transparent 14px),radial-gradient(circle at 64% 70%,#7df9ff44 0 8px,transparent 9px),
        radial-gradient(circle at 30% 40%,#ffd76a44 0 6px,transparent 7px),radial-gradient(circle at 90% 74%,#ffb54a55 0 10px,transparent 11px);animation:bokeh 9s ease-in-out infinite alternate}
      @keyframes bokeh{to{transform:translate(-14px,8px)}}
      .garland{position:absolute;left:-4%;top:-6px;z-index:3;width:108%;height:150px;pointer-events:none;overflow:visible}
      .garland g{transform-origin:50% 0;animation:sway 7s ease-in-out infinite alternate}.garland g+g{animation-duration:9s;animation-direction:alternate-reverse}
      @keyframes sway{from{transform:rotate(-.8deg)}to{transform:rotate(.8deg)}}
      .garland circle{animation:twinkle 1.6s ease-in-out infinite alternate}.garland circle:nth-child(3n){animation-delay:-.6s}.garland circle:nth-child(3n+1){animation-delay:-1.1s}
      @keyframes twinkle{to{opacity:.45}}
      .top.go .garland circle{animation:flash .25s 6 alternate}@keyframes flash{to{opacity:.1}}.top.go h1{animation:neon2 1.6s both}@keyframes neon2{0%,20%,40%{opacity:.15;text-shadow:none}10%,30%,60%,100%{opacity:1}}
      .lant i{position:absolute;bottom:-60px;z-index:2;width:var(--s);height:calc(var(--s) * 1.2);border-radius:40% 40% 28% 28%/50% 50% 30% 30%;
        background:radial-gradient(ellipse at 50% 70%,#fff3c4 0,#ffb347 45%,#e0561b 100%);box-shadow:0 0 18px 4px #ff9a2e88,0 0 50px 10px #ff6a0033;animation:lrise var(--d) linear infinite;animation-delay:var(--w);opacity:0}
      @keyframes lrise{0%{opacity:0;transform:translate(0,0)}8%{opacity:1}50%{transform:translate(var(--x),-55vh)}90%{opacity:.9}100%{opacity:0;transform:translate(calc(var(--x) * -.4),-112vh) scale(.6)}}
      .top .t{z-index:4;padding:0 20px 48px}
      .kick{color:#ffd76a;text-shadow:0 0 10px #ffb000aa}
      .top h1{color:#fff;text-shadow:0 0 4px #fff,0 0 14px var(--accent),0 0 34px var(--accent),0 0 70px var(--accent);animation:neon 2.4s .2s both}
      @keyframes neon{0%,14%,19%,24%,51%{opacity:.12;text-shadow:none}16%,22%,54%,100%{opacity:1}}
      .top .tag{color:#e6e0ff;margin-left:auto;margin-right:auto}
      .badge,.badge.open{margin-top:20px;padding:8px 18px;background:#0b0d26aa;border:2px solid #ff6fb8;color:#ffd0ea;box-shadow:0 0 14px #ff4fa388,inset 0 0 10px #ff4fa344;border-radius:10px;text-transform:uppercase;letter-spacing:.12em;font-size:14px;font-weight:600}
      .badge.open{border-color:#5dffb0;color:#d9ffe9;box-shadow:0 0 16px #19ff9a99,inset 0 0 10px #19ff9a44;animation:hum 3s ease-in-out infinite}
      @keyframes hum{50%{box-shadow:0 0 26px #19ff9acc,inset 0 0 14px #19ff9a66}}
      .top .cr{bottom:8px;left:12px;right:12px;text-align:center}
            .card{background:linear-gradient(180deg,#161b45,#10143a);border:1px solid var(--line);box-shadow:0 0 0 1px #ff4fa31f,0 16px 44px #0009}
      .card h2{color:#ff9bd0;text-shadow:0 0 14px #ff4fa3aa}
      .menu .p{color:#ffd76a;text-shadow:0 0 10px #ffb00066}
      .btn{border-radius:14px;box-shadow:0 0 22px color-mix(in srgb,var(--accent) 55%,transparent)}
      .btn.line,.btn.grab{box-shadow:none}.btn.dark{background:#fdf6ff;color:#0b0d26;box-shadow:0 0 18px #ffffff44}
      .tshare{top:auto;bottom:auto;top:58px;border:2px solid #ff6fb8;color:#ffd0ea;background:#0b0d26aa;box-shadow:0 0 12px #ff4fa388}`,
    art: '',
    deco: () => {
      const strand = (y0, sag, n, cols) => {
        let s = `<g><path d="M0 ${y0} Q 50 ${y0 + sag} 100 ${y0}" stroke="#2b2433" stroke-width="1.2" fill="none" vector-effect="non-scaling-stroke"/>`
        for (let i = 1; i < n; i++) {
          const t = i / n, x = 100 * t, y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (y0 + sag) + t * t * y0
          const c = cols[i % cols.length]
          s += `<circle cx="${x.toFixed(2)}" cy="${(y + 2.6).toFixed(2)}" r="1.7" fill="${c}" style="filter:drop-shadow(0 0 3px ${c}) drop-shadow(0 0 6px ${c})"/>`
        }
        return s + '</g>'
      }
      const lant = [[12, 26, 19, -4, 30], [27, 18, 23, -11, -60], [48, 30, 17, -2, 40], [66, 22, 25, -15, -20], [80, 16, 21, -8, 60], [90, 24, 28, -19, -40]]
      return {
        ph: '<span class="bokeh"></span>',
        front: `<svg class="garland" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">${strand(4, 16, 13, ['#ffd76a', '#ff4fa3', '#7df9ff', '#ffb347'])}${strand(2, 28, 17, ['#ffb347', '#ffd76a', '#ff7ad1'])}</svg>` +
          `<span class="lant" aria-hidden="true">${lant.map(([l, s, d, w, x]) => `<i style="left:${l}%;--s:${s}px;--d:${d}s;--w:${w}s;--x:${x}px"></i>`).join('')}</span>`,
      }
    },
  },

  // Lanna Craft: lacquer red stencilled in gold, the photo in a temple gable, the name in gold leaf
  lanna: {
    label: 'Lanna gold', fonts: ['Chonburi', 'Prompt'], accent: '#e2b03a',
    vars: `--bg:#4a0c12;--card:#fff6e3;--ink:#3b0a0d;--mute:#6e3f30;--line:#ebcf86;--hero:#3b0a0d;--r:6px;--em:.62;
      --display:"Chonburi","Iowan Old Style",Georgia,serif;--body:"Prompt",system-ui,-apple-system,"Segoe UI",${F_THAI},sans-serif;--case:none;--h1w:400;--track:0`,
    css: `body{color:#fff3dc;background-color:#4a0c12;background-image:${enc('<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56"><g fill="#e2b03a" opacity=".16"><path d="M28 10c4 6 4 12 0 18-4-6-4-12 0-18zM28 46c4-6 4-12 0-18-4 6-4 12 0 18zM10 28c6-4 12-4 18 0-6 4-12 4-18 0zM46 28c-6 4-12 4-18 0 6-4 12-4 18 0z"/><circle cx="0" cy="0" r="2.5"/><circle cx="56" cy="0" r="2.5"/><circle cx="0" cy="56" r="2.5"/><circle cx="56" cy="56" r="2.5"/><circle cx="28" cy="28" r="2.2"/></g></svg>')}}
      .top{display:flex;flex-direction:column;align-items:center;text-align:center;color:#fff3dc;background:transparent;padding-top:52px}
      .top .pf{width:min(84%,500px);height:min(58vh,520px);min-height:300px;margin:0 auto}
      .top .ph{clip-path:polygon(50% 0,100% 26%,100% 100%,0 100%,0 26%)}
      .top .ph::before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,#3b0a0d66,transparent 30%)}
      .top .ph>img{filter:saturate(1.1) contrast(1.05)}
      .top .ph::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 60%,#3b0a0d99)}
      .gable{position:absolute;inset:0;z-index:3;width:100%;height:100%;overflow:visible;pointer-events:none}
      .gable{animation:raise 1.5s .15s cubic-bezier(.3,.7,.2,1) both}@keyframes raise{from{clip-path:inset(100% -20% 0 -20%)}to{clip-path:inset(-20% -20% 0 -20%)}}
      .gable path{fill:none;stroke:#e2b03a;vector-effect:non-scaling-stroke;stroke-linejoin:round}.gable path+path{stroke:#ffd77a}
      .fin{opacity:0;animation:finin .6s 1.4s ease-out forwards,shine 3.2s 2s ease-in-out infinite}@keyframes finin{to{opacity:1}}
      .top.go h1 .w{animation:sweep 1.2s ease-in-out}@keyframes sweep{from{background-position:120% 0}to{background-position:-20% 0}}.top.go .fin{animation:finin 0s forwards,shine .4s 4 alternate}
      .fin{position:absolute;z-index:4;width:34px;height:48px;pointer-events:none;transform-origin:50% 100%}
      .fin.a{left:50%;top:-44px;margin-left:-17px}.fin.l{left:-20px;top:calc(26% - 40px);transform:rotate(-38deg)}.fin.r{right:-20px;top:calc(26% - 40px);transform:rotate(38deg)}
            .top .cr{bottom:8px;right:10px}
      .top .t{padding:26px 20px 34px}
      .kick{color:#f3c552}
      .top h1 .w{background:linear-gradient(100deg,#b5832a 0%,#f8dd8e 24%,#fff6d5 31%,#d9a441 47%,#f3c552 63%,#9c6a1c 100%);background-size:240% 100%;-webkit-background-clip:text;background-clip:text;color:#f3c552;-webkit-text-fill-color:transparent;animation:leaf 6s ease-in-out infinite}
      .top h1{line-height:1.12;filter:drop-shadow(0 2px 0 #2a0508)}
      .top .tag{color:#fff3dc;margin-left:auto;margin-right:auto}
      .badge,.badge.open{background:#2a0508;color:#f3c552;box-shadow:inset 0 0 0 1px #e2b03a;border-radius:4px}
      .badge.open{color:#a6f0c6}
      .card{border:2px solid #e2b03a;box-shadow:0 0 0 6px var(--card),0 0 0 8px #e2b03a,0 18px 40px #0006}
      .card h2{font:400 26px/1.2 var(--display);color:#8a1a1f;text-transform:none;letter-spacing:0}
      .kranok{height:28px;background:${enc('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="28"><path d="M20 26C10 22 8 12 14 6c0 6 4 8 6 8 2 0 6-2 6-8 6 6 4 16-6 20z" fill="#e2b03a"/><path d="M20 22c-4-2-5-6-3-9 1 3 2 4 3 4s2-1 3-4c2 3 1 7-3 9z" fill="#4a0c12"/></svg>')} center/40px 28px repeat-x;margin:20px 0}
      .btn{background:linear-gradient(180deg,#f8dd8e,#d9a441);color:#3b0a0d;border-radius:6px}.btn.dark{background:#2a0508;color:#f3c552;box-shadow:inset 0 0 0 1px #e2b03a}
      .menu .p{color:#8a1a1f;font:400 22px/1 var(--display)}
      .foot{color:#fff3dc}.foot a{color:#ffd77a}.share,.credits{color:var(--ink)}
      .tshare{border:1px solid #e2b03a;background:#2a0508cc;color:#f3c552}`,
    art: '',
    deco: () => {
      const fin = (c) => `<svg class="fin ${c}" viewBox="0 0 34 48" aria-hidden="true"><path d="M17 47C6 42 3 30 9 20c0 8 4 11 8 11s8-3 8-11c6 10 3 22-8 27z" fill="#e2b03a"/><path d="M17 31C12 25 12 13 17 1c5 12 5 24 0 30z" fill="#ffd77a"/><path d="M17 42c-5-3-6-9-3-13 1 4 2 5 3 5s2-1 3-5c3 4 2 10-3 13z" fill="#4a0c12"/></svg>`
      return {
        frame: `<svg class="gable" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path stroke-width="7" d="M0 101V26L50 0 100 26V101"/><path stroke-width="1.5" d="M3.5 101V28.2L50 4.2 96.5 28.2V101"/></svg>${fin('a')}${fin('l')}${fin('r')}`,
      }
    },
  },

  // Plain and quiet: the photo, then a white sheet sliding up over it with the name in black
  clean: {
    label: 'Clean', fonts: ['Prompt'], accent: '#2563eb',
    vars: `--bg:#ffffff;--card:#ffffff;--ink:#111827;--mute:#4b5563;--line:#e5e7eb;--hero:#e5e7eb;--r:14px;--em:.58;
      --display:"Inter","SF Pro Display",system-ui,-apple-system,"Segoe UI",${F_THAI},sans-serif;--body:system-ui,-apple-system,"Segoe UI",${F_THAI},sans-serif;
      --case:none;--h1w:700;--track:-.03em`,
    css: `.top{display:flex;flex-direction:column;background:#fff}
      .top .pf{height:min(56vh,540px);min-height:280px}
      .top .ph>img{animation:kb 16s cubic-bezier(.2,.6,.2,1) both}@keyframes kb{from{transform:scale(1.14)}}
      .top.go .ph>img{animation:breathe 1.4s cubic-bezier(.3,1.4,.4,1)}@keyframes breathe{40%{transform:scale(1.05)}}
      .top .cr{bottom:38px;right:12px}
      .top .t{z-index:4;margin-top:-28px;padding:30px 22px 22px;background:#fff;border-radius:28px 28px 0 0;box-shadow:0 -12px 30px rgba(17,24,39,.10);animation:sheet .9s .25s cubic-bezier(.2,.8,.2,1) both}
      .top:not(.has-cover) .t{margin-top:0;box-shadow:none}
      @keyframes sheet{from{transform:translateY(46px);opacity:0}}
      .kick{color:#6b7280;letter-spacing:.14em}
      .top h1{color:#111827;line-height:1.03}
      .top .tag{color:#4b5563}
      .badge,.badge.open{margin-top:14px;padding:0;background:none;color:#4b5563;font-weight:500;font-size:16px}
      .badge .dot{background:#9ca3af}.badge.open{color:#047857}.badge.open .dot{background:#10b981}
            .wrap>.card,.wrap>section.card{margin:0;padding:28px 2px;border-radius:0;background:none;border-top:1px solid var(--line)}
      .card.mapcard{padding:0}.card.mapcard>h2{padding:28px 2px 0}.card.mapcard>.in{padding:0 2px 28px}
      .card h2{color:#6b7280;font-size:12.5px;letter-spacing:.16em}
      .reach{margin-bottom:26px}.btn{border-radius:14px}.reach .btn:first-child{background:#111827;color:#fff}
      .menu .p{color:#111827}
      .tshare{border:0;background:#fff;color:#111827;box-shadow:0 2px 10px rgba(17,24,39,.18)}`,
    art: '',
  },

  // Gold: black lacquer, a fan of gold rays, the photo in an arched window, gold leaf falling
  gold: {
    label: 'Gold leaf', gold: true, fonts: ['Chonburi', 'Prompt'], accent: '#e7b84a',
    vars: `--bg:#0c0a07;--card:#14100a;--ink:#f6e7c1;--mute:#d2bd8f;--line:#4d3b1c;--hero:#0c0a07;--r:4px;--em:.66;
      --display:"Prompt","Avenir Next",${F_THAI},sans-serif;--body:"Prompt",system-ui,-apple-system,"Segoe UI",${F_THAI},sans-serif;--case:uppercase;--h1w:600;--track:.14em`,
    css: `.top{display:flex;flex-direction:column;align-items:center;text-align:center;background:var(--bg);color:var(--ink);padding-top:34px}
      .fan{position:absolute;left:50%;top:40%;z-index:0;width:1500px;height:1500px;margin:-750px 0 0 -750px;pointer-events:none;
        background:repeating-conic-gradient(from 0deg,#e7b84a26 0deg 1.4deg,transparent 1.4deg 7.5deg);-webkit-mask:radial-gradient(circle,#000 4%,transparent 34%);mask:radial-gradient(circle,#000 4%,transparent 34%);animation:fan 60s linear infinite}
      @keyframes fan{to{transform:rotate(360deg)}}
      .top .pf{width:min(76%,440px);height:min(52vh,470px);min-height:290px;margin:0 auto;z-index:1}
      .top .ph{clip-path:inset(0 round 50% 50% 0 0 / 34% 34% 0 0)}
      .top .ph>img{filter:saturate(.9) contrast(1.06) brightness(.94)}
      .top .pf::before,.top .pf::after{content:"";position:absolute;z-index:2;pointer-events:none;border:1px solid #e7b84a;border-radius:50% 50% 0 0/34% 34% 0 0;border-bottom:0}
      .top .pf::before{inset:-9px -9px 0}.top .pf::after{inset:-17px -17px 0;border-color:#e7b84a88}
      .top .pf::before,.top .pf::after{animation:arch 1.6s .1s cubic-bezier(.3,.7,.2,1) both}@keyframes arch{from{clip-path:inset(100% 0 0 0)}to{clip-path:inset(0)}}
      .top .ph{animation:fadein 1.2s .3s ease both}@keyframes fadein{from{opacity:0}}
      .top h1{animation:deco 1.5s .5s cubic-bezier(.2,.8,.2,1) both}.top h1.th{animation:wordup 1s .5s cubic-bezier(.2,.8,.2,1) both}@keyframes deco{from{opacity:0;letter-spacing:.55em}}
      
      .flakes i{position:absolute;top:-24px;z-index:3;width:var(--s);height:calc(var(--s) * .8);background:linear-gradient(135deg,#fff6d5,#e7b84a 45%,#8e5f17);clip-path:polygon(10% 30%,60% 0,100% 40%,70% 100%,20% 85%);
        animation:fall var(--d) linear infinite;animation-delay:var(--w);opacity:.9;pointer-events:none}
      .top.go .flakes i{animation-duration:3.5s}.top.go h1 .w{animation:sweep2 1.1s ease-in-out}@keyframes sweep2{from{background-position:130% 0}to{background-position:-30% 0}}
      @keyframes fall{0%{transform:translate(0,0) rotate(0)}50%{transform:translate(var(--x),55vh) rotate(260deg)}100%{transform:translate(calc(var(--x) * -.5),110vh) rotate(520deg)}}
      .top .cr{bottom:8px;right:10px;max-width:34%}
      .top .t{z-index:2;padding:44px 22px 40px}
      .kick{display:flex;align-items:center;justify-content:center;gap:12px;color:#e7b84a;letter-spacing:.26em}
      .kick::before,.kick::after{content:"";width:34px;height:1px;background:linear-gradient(90deg,transparent,#e7b84a)}.kick::after{transform:scaleX(-1)}
      .top h1{font-size:min(clamp(30px,9cqi,70px),calc((100cqi - 44px) / (var(--lw,8) * var(--em))));line-height:1.12}
      .top h1.th{letter-spacing:0;font-family:"Chonburi",${F_THAI};font-weight:400;--em:.62}
      .top h1 .w{background:linear-gradient(100deg,#9c6a1c 0%,#e7b84a 22%,#fff6d5 30%,#e7b84a 40%,#b5832a 62%,#f8dd8e 80%,#9c6a1c 100%);background-size:260% 100%;-webkit-background-clip:text;background-clip:text;color:#e7b84a;-webkit-text-fill-color:transparent;animation:leaf 5s ease-in-out infinite}
      .top .tag{margin-left:auto;margin-right:auto;color:var(--mute);font-weight:400}
      .badge,.badge.open{margin-top:18px;padding:7px 4px;background:none;border-radius:0;border-top:1px solid #e7b84a66;border-bottom:1px solid #e7b84a66;color:#e7b84a;letter-spacing:.16em;text-transform:uppercase;font-size:12px;font-weight:600}
      .badge.open{color:#b6efc9}
      .card{border:1px solid #e7b84a55;outline:1px solid #e7b84a2e;outline-offset:5px;border-radius:2px}
      .card h2{justify-content:center;font:600 13px/1.2 var(--body);letter-spacing:.32em;color:#e7b84a}
      .btn{background:linear-gradient(180deg,#f8dd8e,#c9952f);color:#1a1205;border-radius:2px;letter-spacing:.1em;text-transform:uppercase;font-size:15px}
      .btn.dark{background:transparent;color:#e7b84a;box-shadow:inset 0 0 0 1px #e7b84a}
      .menu .p{color:#e7b84a}
      .tshare{border:1px solid #e7b84a;background:#0c0a07cc;color:#e7b84a}
      .goldrule{height:30px;margin:24px 0;background:${enc('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="30"><path d="M30 6l6 9-6 9-6-9z" fill="none" stroke="#e7b84a" stroke-width="1.2"/><path d="M0 15h22M38 15h22" stroke="#e7b84a" stroke-width="1"/></svg>')} center/60px 30px repeat-x}`,
    art: '',
    deco: () => {
      const fl = Array.from({ length: 14 }, (_, i) => {
        const r = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
        return `<i style="left:${(r(1) * 100).toFixed(1)}%;--s:${(6 + r(2) * 10).toFixed(1)}px;--d:${(9 + r(3) * 10).toFixed(1)}s;--w:${(-r(4) * 18).toFixed(1)}s;--x:${(r(5) * 60 - 30).toFixed(0)}px"></i>`
      }).join('')
      return { back: '<div class="fan" aria-hidden="true"></div>', front: `<span class="flakes" aria-hidden="true">${fl}</span>` }
    },
  },
}

// The parts every look shares: the photo box that holds still while the page slides over it, the
// credit on one line where it cannot cover the name, the small Gold seal.
export const HERO_CSS = `.top{position:relative;overflow:hidden;color:var(--ink);container-type:inline-size;isolation:isolate}
.top .pf{position:relative;flex:none}
.top .ph{position:absolute;inset:0;overflow:hidden;clip-path:inset(0);background:var(--hero)}
.top .ph>img{position:fixed;inset:0;width:100%;height:100vh;height:100lvh;object-fit:cover}
.top .t{position:relative;z-index:3;width:100%;max-width:760px;margin:0 auto;padding:28px 18px 34px}
.top h1{margin:0;font-family:var(--display);font-weight:var(--h1w);font-size:min(clamp(40px,11cqi,88px),calc((100cqi - 40px) / (var(--lw,8) * var(--em,.62))));line-height:1;letter-spacing:var(--track);text-transform:var(--case);overflow-wrap:break-word;text-wrap:balance}
.top h1.th{text-transform:none;letter-spacing:0}
.top h1 .w{display:inline-block}
.kick{margin:0 0 12px;font:700 12px/1.4 var(--body);letter-spacing:.2em;text-transform:uppercase;color:var(--acc-ink);text-wrap:balance}
.top .tag{margin:12px 0 0;font-size:clamp(18px,4.8cqi,22px);line-height:1.38;max-width:30em}
.top .bar{display:none}
.top .cr{position:absolute;right:10px;bottom:8px;z-index:4;margin:0;max-width:calc(100% - 20px);font-size:10.5px;line-height:1.3;color:#fff;opacity:.78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 1px 2px #000,0 0 6px #000}
.top .cr a{color:inherit}
.top.gilt:not(.has-cover)>.t{padding-top:62px}
.seal{position:absolute;left:12px;top:12px;z-index:7;width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 34% 30%,#fff6d5,#f3c552 42%,#9c6a1c);box-shadow:0 2px 8px rgba(0,0,0,.45),inset 0 0 0 2px #fff4;color:#3a2604}
.seal svg{width:19px;height:19px}
.tshare{position:absolute;right:12px;top:12px;z-index:8;display:grid;place-items:center;width:44px;height:44px;padding:0;border:1px solid rgba(255,255,255,.4);border-radius:50%;background:rgba(10,8,20,.42);color:#fff;cursor:pointer;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:transform .15s}
.tshare:active{transform:scale(.9)}.tshare .i{width:21px;height:21px}
.top:not(.has-cover) .tshare{background:transparent;color:inherit;border-color:currentColor}
@keyframes drift{to{transform:scale(1.08) translate(-1%,-1%)}}
@keyframes grow{from{transform:scaleX(0)}}
@keyframes wordup{from{opacity:0;transform:translateY(16px)}}
@keyframes leaf{50%{background-position:100% 0}}
@keyframes shine{50%{filter:brightness(1.35)}}
@keyframes bobble{50%{transform:translateY(-8px) rotate(14deg)}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}`
