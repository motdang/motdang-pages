# motdang-pages

motdang.net/~ — anyone makes their own page on Mot Dang, from a phone, in any country.

| Path | What |
|---|---|
| `/~name` | the page · `/sign` printable A4 · `/contact.vcf` · `/event.ics` |
| `/~/make` | the builder (`#t=<edit token>` opens a page for editing) |
| `/~/` | every live page, by kind and country · `/~/random` |
| `/~/admin` | held and reported pages (Basic auth, `ADMIN_KEY`) |

One Cloudflare Worker (route `motdang.net/~*`), D1 `motdang-pages`, R2 `motdang-pages`, Workers AI.
`public/s/render.mjs` draws a page from its JSON; the Worker and the builder's preview run the same function.
The edit link is the sign-in: a random token, stored as its SHA-256.
A page goes live when `src/screen.mjs` (rules, then Llama Guard) passes it; photos pass `src/photo.mjs` (vision model).
The live map reads `/tiles/world.pmtiles` from the site bucket when present, else `cm-cr.pmtiles`.

```
npm test                          # node:test, no install
npx wrangler dev --port 8790      # local; .dev.vars proxies /vendor /fonts /tiles from motdang.net
npx wrangler deploy
npx wrangler d1 migrations apply motdang-pages --remote
python3 tools/make_style.py       # after mot-dang's basemap_style.json changes
```
