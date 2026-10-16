// make-amcam.mjs — the amulet camera, a Gold feature of amulet pages (Nan 2026-10-16): each photo becomes a
// new amulet at the top of the page. A photo is kept in this browser (IndexedDB) the moment it is taken,
// cut out and laid on white by Amulet Camera's cutter, uploaded, and only then let go, so a crash or a
// lost signal loses nothing. The cutter is framed from nanobotco.github.io: the model and its library
// load there, never on this origin (CSP_TOOL allows the frame and nothing else).
// Each amulet then has Search (Google Lens on its front photo) and Post (the share sheet, caption copied).

const CUTTER = 'https://nanobotco.github.io/amulet-camera/cut.html'
const CUTTER_ORIGIN = 'https://nanobotco.github.io'

// ---- kept photos -------------------------------------------------------------------------------
const DB = new Promise((ok, no) => {
  const r = indexedDB.open('motdang-amcam', 1)
  r.onupgradeneeded = () => r.result.createObjectStore('shots', { keyPath: 'id' })
  r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error)
})
async function tx(mode, fn) {
  const db = await DB
  return new Promise((ok, no) => {
    const t = db.transaction('shots', mode), r = fn(t.objectStore('shots'))
    t.oncomplete = () => ok(r.result); t.onerror = () => no(t.error); t.onabort = () => no(t.error)
  })
}
const keep = (shot) => tx('readwrite', (s) => s.put(shot))
const forget = (id) => tx('readwrite', (s) => s.delete(id))
const keptFor = async (page) => (await tx('readonly', (s) => s.getAll())).filter((x) => x.page === page).sort((a, b) => a.t - b.t)

// ---- the cutter, in a frame --------------------------------------------------------------------
let frame, frameReady
const waiting = new Map() // id → { ok, no }
let onProgress = () => {}
function cutter() {
  if (frameReady) return frameReady
  frameReady = new Promise((ok, no) => {
    frame = document.createElement('iframe')
    frame.src = CUTTER; frame.title = 'cutter'; frame.setAttribute('aria-hidden', 'true')
    frame.style.cssText = 'position:absolute;width:1px;height:1px;border:0;opacity:0;pointer-events:none'
    frame.onload = () => ok(frame.contentWindow)
    frame.onerror = no
    document.body.append(frame)
  })
  return frameReady
}
addEventListener('message', (e) => {
  if (e.origin !== CUTTER_ORIGIN || !frame || e.source !== frame.contentWindow) return
  const m = e.data || {}
  if (m.type === 'progress') onProgress(m.loaded, m.total)
  const w = waiting.get(m.id)
  if (!w) return
  waiting.delete(m.id)
  if (m.type === 'done' && m.blob instanceof Blob) w.ok(m.blob)
  else if (m.type === 'fail') w.no(new Error(m.error || 'cut'))
})
async function cut(shot) {
  const win = await cutter()
  return new Promise((ok, no) => {
    waiting.set(shot.id, { ok, no })
    win.postMessage({ type: 'cut', id: shot.id, blob: shot.photo }, CUTTER_ORIGIN)
    setTimeout(() => { if (waiting.delete(shot.id)) no(new Error('cut-timeout')) }, 240000)
  })
}

// ---- the tray: photos on their way to becoming amulets -----------------------------------------
let ctx // { page(), send(blob) → photo id, made(photoId), A(key), redraw(), toast(msg) }
const tray = new Map() // id → { url, state, note }
let queue = Promise.resolve()

/** Called by the builder once a page is open. Picks up photos kept from before (a crash, a closed tab). */
export async function amcamInit(c) {
  ctx = c
  let old = []
  try { old = await keptFor(ctx.page()) } catch { return }
  for (const shot of old) { show(shot, 'wait'); run(shot) }
}

/** Photos from the camera or the picker. */
export async function amcamTake(files) {
  for (const f of files) {
    const shot = { id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`, page: ctx.page(), t: Date.now(),
      photo: new Blob([await f.arrayBuffer()], { type: f.type || 'image/jpeg' }) }
    try { await keep(shot) } catch { ctx.toast(ctx.A('cam_nokeep')) }
    show(shot, 'wait')
    run(shot)
  }
}

function show(shot, state, note = '') {
  const had = tray.get(shot.id)
  tray.set(shot.id, { url: had?.url || URL.createObjectURL(shot.photo), state, note, shot })
  paint()
}
function let_go(id) {
  const x = tray.get(id)
  if (x) URL.revokeObjectURL(x.url)
  tray.delete(id); paint()
}

function run(shot) {
  queue = queue.then(async () => {
    if (!tray.has(shot.id)) return
    show(shot, 'cut')
    onProgress = (l, t) => show(shot, 'cut', ctx.A('cam_getting').replace('{a}', Math.round(l / 1e6)).replace('{b}', Math.round(t / 1e6)))
    let front = null
    try { front = await cut(shot) } catch (e) { console.warn('cut', e) } // no cutout: the photo itself goes up
    show(shot, 'send')
    try {
      const id = await ctx.send(front || shot.photo)
      ctx.made(id)
      await forget(shot.id).catch(() => {})
      let_go(shot.id)
    } catch (e) {
      if (e.message === 'photo-refused') show(shot, 'refused')
      else if (e.message === 'full') show(shot, 'refused', ctx.A('cam_full'))
      else show(shot, 'net')
    }
  })
}
addEventListener('online', () => { for (const x of tray.values()) if (x.state === 'net') run(x.shot) })

/** The tray's HTML, inside the amulets section; the section is redrawn often, so it paints itself too. */
export function amcamTray() {
  return `<div class="amtray" id="amtray">${trayInner()}</div>`
}
function trayInner() {
  if (!ctx || !tray.size) return ''
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  return [...tray].map(([id, x]) => `<figure class="${x.state}"><img src="${x.url}" alt=""><figcaption>${esc(x.note || ctx.A('cam_' + x.state))}</figcaption>
    ${x.state === 'net' ? `<button type="button" data-amcamretry="${id}">${esc(ctx.A('cam_retry'))}</button>` : ''}
    ${x.state === 'refused' || x.state === 'net' ? `<button type="button" data-amcamdrop="${id}" aria-label="×">×</button>` : ''}</figure>`).join('')
}
function paint() { const el = document.getElementById('amtray'); if (el) el.innerHTML = trayInner() }

/** Clicks inside the tray; the builder passes every click here first. True when handled. */
export function amcamClick(t) {
  const r = t.closest?.('[data-amcamretry]'), d = t.closest?.('[data-amcamdrop]')
  if (r) { const x = tray.get(r.dataset.amcamretry); if (x) run(x.shot); return true }
  if (d) {
    if (!confirm(ctx.A('cam_dropq'))) return true
    forget(d.dataset.amcamdrop).catch(() => {}); let_go(d.dataset.amcamdrop); return true
  }
  return false
}

// ---- Search and Post ---------------------------------------------------------------------------

/** Google Lens on a photo of the page. A photo still waiting for its check is not public yet: the share sheet then (Lens is in it). */
export async function amLens(photoUrl, blob, name) {
  const w = window.open('about:blank', '_blank')
  try {
    const r = await fetch(photoUrl, { method: 'HEAD' })
    if (!r.ok) throw new Error('not yet public')
    const lens = 'https://lens.google.com/uploadbyurl?url=' + encodeURIComponent(photoUrl)
    if (w) w.location = lens; else location.href = lens
  } catch {
    w?.close()
    if (blob) shareFile(new File([blob], name + '.jpg', { type: blob.type || 'image/jpeg' }))
  }
}

/** The front photo to the share sheet (Facebook, then the group), the caption on the clipboard. */
export async function amPost(blob, name, caption, done) {
  try { await navigator.clipboard.writeText(caption) } catch {}
  done()
  if (blob) shareFile(new File([blob], name + '.jpg', { type: blob.type || 'image/jpeg' }), caption)
}

function shareFile(f, text) {
  if (navigator.canShare?.({ files: [f] })) return navigator.share(text ? { files: [f], text } : { files: [f] }).catch(() => {})
  const a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}
