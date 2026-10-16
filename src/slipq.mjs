// slipq.mjs — a slip that waits, answered from the LINE note with no password.
// NaN 2026-10-15: "keep the number of times she needs to use a password to the
// absolute minimum." Each note carries its own link for that one payment: signed
// with SESSION_SECRET, good for 7 days, done once the payment is answered.

const DAYS = 7

async function sig(env, payId, exp, sha) {
  return (await sha(`${env.SESSION_SECRET || 'dev'}|slip|${payId}|${exp}`)).slice(0, 24)
}

/** The link for one waiting payment. */
export async function link(env, origin, payId, sha) {
  const exp = Math.floor(Date.now() / 1000 + DAYS * 86400).toString(36)
  return `${origin}/q/${payId}.${exp}.${await sig(env, payId, exp, sha)}`
}

/** The payment id a link opens, or null. */
export async function read(env, path, sha) {
  const m = /^\/q\/([a-z0-9]{12})\.([a-z0-9]{1,10})\.([a-f0-9]{24})(\/slip)?$/.exec(path)
  if (!m) return null
  if (parseInt(m[2], 36) * 1000 < Date.now()) return { expired: true }
  if (m[3] !== (await sig(env, m[1], m[2], sha))) return null
  return { payId: m[1], img: !!m[4] }
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** The page: slip, amount, shop, two buttons; or what became of it. */
export function page({ title, name, amount, status, note, fee, founding }, self, origin) {
  const done = status === 'paid' ? ['✓ จ่ายแล้ว · Paid', founding ? 'สมาชิกผู้ก่อตั้งได้เลขและโค้ดทองแล้ว · The founding member has a number and Gold codes.' : fee ? 'ค่าธรรมเนียมดีลเข้าแล้ว · The deal fee is in.' : 'หน้าเว็บเป็นทองแล้ว · The page is Gold.'] : status === 'refused' ? ['✕ ไม่ได้จ่าย · Not paid', 'ปฏิเสธแล้ว · Refused.'] : null
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>สลิป · Slip · ${esc(title)}</title>
<style>body{margin:0;font:17px/1.45 system-ui,sans-serif;background:#fff8e7;color:#1c1530}main{max-width:480px;margin:0 auto;padding:18px 16px 40px}
h1{font-size:22px;margin:0 0 4px}.amt{font-size:34px;font-weight:800;margin:6px 0}img{width:100%;border-radius:12px;border:2px solid #1c1530;margin:12px 0}
.row{display:flex;gap:10px;margin-top:8px}button{flex:1;font:inherit;font-weight:800;padding:16px;border-radius:12px;border:2px solid #1c1530;cursor:pointer}
.ok{background:#f5c518;color:#000}.no{background:#fff;color:#1c1530}.hint{font-size:15px;color:#4a4458}.done{font-size:24px;font-weight:800;margin:14px 0 4px}a{color:#1c1530}</style></head>
<body><main><h1>${esc(title)}</h1><p class="hint"><a href="${esc(origin)}/${esc(name)}">${esc(origin.replace(/^https?:\/\//, ''))}/${esc(name)}</a></p>
<p class="amt">฿${esc(amount)}</p>
${done ? `<p class="done">${done[0]}</p><p>${done[1]}</p>` : `<p class="hint">ดูในแอปธนาคาร: เงินเข้าตรงยอดนี้ รวมสตางค์ไหม<br>Bank app: did this exact amount arrive, satang too?</p>
<img src="${esc(self)}/slip" alt="slip">
<form method="post" class="row"><button class="ok" name="act" value="ok">✓ เงินเข้าแล้ว<br>Paid</button><button class="no" name="act" value="no">✕ ไม่เข้า<br>Not paid</button></form>`}
${note ? `<p class="hint">SlipOK: ${esc(note)}</p>` : ''}</main></body></html>`
}
