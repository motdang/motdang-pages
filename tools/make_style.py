"""public/s/style.json from Mot Dang's own basemap style (data/basemap_style.json):
the same ground and colours, without the relief (no terrain archive for the
world) and without the icon layers (their sprite is drawn by motdang's map.js).
The tiles url is filled in the browser: map.mjs picks the archive."""
import json, pathlib
here = pathlib.Path(__file__).resolve().parent.parent
md = here.parent / "mot-dang" / "data" / "basemap_style.json"
src = json.loads(md.read_text())
layers = [l for l in src["layers"]
          if l.get("type") != "hillshade" and "icon-image" not in l.get("layout", {}) and l["id"] != "moat-over"]
style = {"version": 8, "glyphs": "GLYPHS", "sources": {"p": {"type": "vector", "url": "TILES",
         "attribution": "© OpenStreetMap contributors · Protomaps"}}, "layers": layers}
out = here / "public" / "s" / "style.json"
out.write_text(json.dumps(style, ensure_ascii=False, separators=(",", ":")))
print(out, out.stat().st_size, len(layers), "layers")
