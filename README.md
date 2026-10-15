# motdang-pages

sites.motdang.net — anyone makes their own page on Mot Dang, from a phone, in any country.

| Path | What |
|---|---|
| `/` | the page maker's front page: the visitor's shop drawn as they type, example pages, the tools, Free and Gold |
| `/name` | a page · `/sign` printable A4 · `/contact.vcf` · `/event.ics` · `/w/<id>` a portfolio project |
| `/make` | the builder (`#t=<edit token>` opens a page; `#title=…&kind=…` starts one); tabs Page · Messages · Traffic · Gold |
| `/all` · `/random` | every live page (Gold first) · one at random |
| `/map?pin=lat,lng&pn=name&embed=1` | a page's drawn map: motdang.net's doodle-map engine on the world tiles, base href motdang.net |
| `/feed.json` · `/api/find?q=` | live pages as data for motdang.net (search, place pages, maps) |
| `/admin` | held and reported pages, held photos, Gold slips (Basic auth, `ADMIN_KEY`) |
| `motdang.net/~…` | the first address (2026-10-12): 301 to the same page here |

One Cloudflare Worker (custom domain `sites.motdang.net`, route `motdang.net/~*`), D1 `motdang-pages`, R2 `motdang-pages`, Workers AI.
`public/s/render.mjs` draws a page from its JSON; the Worker, the builder's preview and the front page's example phones run the same function.
A page carries: a drawing of the place by motdang.net's auto-doodler (`/front/doodler*.js`, lit by the sun where it stands, tap for morning/evening/night), the drawn map, doodle dingbats (`public/s/db/`, built by `tools/dingbats.mjs` from `../doodle-dingbats`), LINE / Grab / directions / ordering, a message form, share buttons with a QR and a 1080×1920 story picture, and credits for library pictures.
Pictures: the builder searches Wikimedia Commons (public domain and CC0 by structured data), the Cleveland Museum of Art (CC0) and Openverse (PDM, CC0) through `src/pd.mjs`; the credit is looked up again at the source and stored with the photo.
Picture studio (2026-10-15): `public/s/studio.mjs` turns any photo into a fixed photo or a drawing (pen and ink, watercolour, riso, gold lacquer, comic) in the maker's browser; `public/s/mark.mjs` builds an avatar or a cover from parts (shape, colour, pattern, a dingbat, letters, typeface); `public/s/studio-ui.mjs` holds the two sheets. The result uploads like any photo and passes the same check.
Portfolio (kind `work`): projects with client, year, role, tags, words, a link and photos, each at `/name/w/<id>`; client words; an avatar beside the name on any page. Free pages show 6 projects, Gold 60.
Traffic: `src/stats.mjs` counts visits, people (a salted hash a day), machines apart, referrers, countries, devices, hours and button taps per page.
Messages: `src/msg.mjs`; a copy goes by Resend to an address the maker confirmed (25 a page a day, 90 in all).
Gold: `src/gold.mjs`, ฿3,000 a year by PromptPay with a satang tail; SlipOK checks the slip when its keys are set, otherwise the slip waits at /admin.
The edit link is the sign-in: a random token, stored as its SHA-256. A page goes live when `src/screen.mjs` (rules, then Llama Guard) passes it; photos pass `src/photo.mjs` (vision model).

```
npm test                          # node:test, no install
npx wrangler dev --port 8790      # local; .dev.vars: DEV_PROXY, DEV_ORIGIN, ADMIN_KEY, SESSION_SECRET, PROMPTPAY
npx wrangler deploy
npx wrangler d1 migrations apply motdang-pages --remote
node tools/dingbats.mjs           # after ../doodle-dingbats changes
python3 tools/make_style.py       # after mot-dang's basemap_style.json changes
```
