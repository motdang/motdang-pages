# motdang-pages

sites.motdang.net — anyone makes their own page on Mot Dang, from a phone, in any country.

| Path | What |
|---|---|
| `/` | the page maker's front page: the visitor's shop drawn as they type, example pages, the tools, Free and Gold |
| `/name` | a page · `/sign` printable A4 · `/contact.vcf` · `/event.ics` · `/w/<id>` a portfolio project · `/a/<id>` an amulet |
| `/make` | the builder (`#t=<edit token>` opens a page; `#title=…&kind=…` starts one); tabs Page · Messages · Traffic · Gold |
| `/all` · `/random` | every live page (Gold first) · one at random |
| `/map?pin=lat,lng&pn=name&embed=1` | a page's drawn map: motdang.net's doodle-map engine on the world tiles, base href motdang.net |
| `/feed.json` · `/api/find?q=` | live pages as data for motdang.net (search, place pages, maps) |
| `/tap` · `/tap/<id>` · `/tap/me` | touch phones: an NFC sticker opens `/tap/<id>` (the card drops in, Save contact, LINE, a link); two phones on a tap page knock together and swap cards; the owner's page writes the sticker (`tap.mjs`) |
| `/admin` | held and reported pages, held photos, Gold slips, page checks (Basic auth, `ADMIN_KEY`) |
| `/x/<link>` | a translator's page check: the maker's words beside the machine's, a fix per line (`src/trcheck.mjs`) |
| `motdang.net/~…` | the first address (2026-10-12): 301 to the same page here |

One Cloudflare Worker (custom domain `sites.motdang.net`, route `motdang.net/~*`), D1 `motdang-pages`, R2 `motdang-pages`, Workers AI.
`public/s/render.mjs` draws a page from its JSON; the Worker, the builder's preview and the front page's example phones run the same function.
A page carries: a drawing of the place by motdang.net's auto-doodler (`/front/doodler*.js`, lit by the sun where it stands, tap for morning/evening/night), the drawn map, doodle dingbats (`public/s/db/`, built by `tools/dingbats.mjs` from `../doodle-dingbats`), LINE / Grab / directions / ordering, a message form, share buttons with a QR and a 1080×1920 story picture, and credits for library pictures.
Pictures: the builder searches Wikimedia Commons (public domain and CC0 by structured data), the Cleveland Museum of Art (CC0) and Openverse (PDM, CC0) through `src/pd.mjs`; the credit is looked up again at the source and stored with the photo.
Picture studio (2026-10-15): `public/s/studio.mjs` turns any photo into a fixed photo, a watercolour, a riso print or a sun print (more styles in the engine for tools/bands.py) in the maker's browser, with its tools in `public/s/studio-core.mjs`; `tools/studiolab.mjs` renders every style over fifteen test photos into sheets (`notes/screens/studio-*.png`); `public/s/mark.mjs` builds an avatar or a cover from parts (shape, colour, pattern, a dingbat, letters, typeface); `public/s/studio-ui.mjs` holds the two sheets. The result uploads like any photo and passes the same check.
Doodle anything (2026-10-16): `public/s/doodle-ui.mjs` is a sheet where a maker says what to draw, or picks one of the page's photos, in one of six styles (pen, crayon, watercolour, Lanna mural, cute sticker, night neon) and chooses one of two doodles for the cover or the photos. `src/doodle.mjs` (`POST /api/doodle`) reads the words through `src/doodle-guard.mjs` (a word list, Llama Guard, and a model that reads the meaning and writes an English brief), draws with FLUX.2 klein in the house style, looks at each picture again (`photo.mjs look`, then lettering, royals, Buddha images and monks) and keeps the chosen one as a photo with the credit `{from:'doodle', style, prompt}`. Free pages ask for 5 doodles a day, Gold pages and the 30-day trial 30. The 1024 px and 480 px WebP copies come from the `IMAGES` binding. `tools/doodlelab/` runs every style with every kind.
Portfolio (kind `work`): projects with client, year, role, tags, words, a link and photos, each at `/name/w/<id>`; client words; an avatar beside the name on any page. Free pages show 6 projects, Gold 60.
Amulet seller (kind `amulet`, 2026-10-15): `public/s/amulet.mjs` (data, page, words) and `public/s/make-amulet.mjs` (builder); each amulet has temple, maker, year (BE), material, mould, size, condition, certificate, frame, a price or none, a status (available, reserved, gone, on show) and up to 12 photos, front first, and its own page at `/name/a/<id>` with a LINE reserve button that carries the amulet's name and link. Free pages show 6 amulets, Gold 120. Gold amulet pages hold 360 photos (others 120). The amulet camera (Gold, 2026-10-16, `public/s/make-amcam.mjs`): each photo a new amulet, kept in the phone until it is up, its background cut by Amulet Camera's framed cutter (nanobotco.github.io/amulet-camera/cut.html); Search (Google Lens) and Post (share sheet, caption copied) on each amulet.
Prices that follow demand (2026-10-20, for the Kamthieng and Warorot markets): `public/s/shoup.mjs` (Rung's ladder and SFpark's 80/60 rule) and `src/prices.mjs`. A thing a shop sells or an amulet can be switched to move. Made things: units sold in 30 days (the seller marks each sale, at the stall or anywhere) over how many they can sell a month; over 80% one rung up, under 60% one down, never under their lowest. Amulets: asks (Reserve taps on the page, one a reader a day, and asks the seller marks) shared by a batch (temple, maker, year, mould); two in 7 days one rung up, otherwise the price holds unless the seller lets it fall. Checked Monday 06:00 Bangkok by the cron; the price today is `price_now`, put into the page as it is served. The builder's Prices tab has the one-tap buttons. Market sign-up: `/make?by=<seller>#m=kamthieng&kind=amulet` or `#m=warorot&kind=shop` opens three screens (`public/s/make-market.mjs`). `node tools/phone.mjs <dir>` walks both at 390 px with no server.
Traffic: `src/stats.mjs` counts visits, people (a salted hash a day), machines apart, referrers, countries, devices, hours and button taps per page.
Page checks (2026-10-16): a gig made at /admin or `POST /admin/gig?json=1` (name, lang, who) gives a signed link, 30 days. A save writes `tr_fix`, keyed by the maker's words, which wins over the cron's `tr` row and outlives it; a line whose words changed shows its old fix, flagged. Each save posts to #people-team; the `gig` row (posted, taken) is read into Paid in Art's data/gigs.tsv.
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
