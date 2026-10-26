// osign.mjs — the links an order carries, signed with SESSION_SECRET like slipq.mjs: the buyer's /o/<id>.<sig>
// (their receipt, their tracking, their downloads; no password) and the team's /sh/<job>.<exp>.<sig> (a parcel Mot Dang ships).

const sig = async (env, sha, ...parts) => (await sha([env.SESSION_SECRET || 'dev', ...parts].join('|'))).slice(0, 24)

/** The buyer's page for one order. */
export async function orderLink(env, origin, id, sha) {
  return `${origin}/o/${id}.${await sig(env, sha, 'order', id)}`
}

/** What a /o/ path opens: { id, slip, dl } for a good signature, else null. */
export async function readOrder(env, path, sha) {
  const m = /^\/o\/([a-z0-9]{14})\.([a-f0-9]{24})(?:\/(slip)|\/d\/([a-z0-9]{4,12}))?$/.exec(path)
  if (!m || m[2] !== (await sig(env, sha, 'order', m[1]))) return null
  return { id: m[1], slip: !!m[3], dl: m[4] || '' }
}

const TEAM_DAYS = 30

/** The team's link for one parcel. */
export async function teamLink(env, origin, jobId, sha) {
  const exp = Math.floor(Date.now() / 1000 + TEAM_DAYS * 86400).toString(36)
  return `${origin}/sh/${jobId}.${exp}.${await sig(env, sha, 'ship', jobId, exp)}`
}

/** The job a /sh/ path opens: { jobId }, { expired: true }, or null. */
export async function readTeam(env, path, sha) {
  const m = /^\/sh\/([a-z0-9]{12})\.([a-z0-9]{1,10})\.([a-f0-9]{24})$/.exec(path)
  if (!m || m[3] !== (await sig(env, sha, 'ship', m[1], m[2]))) return null
  if (parseInt(m[2], 36) * 1000 < Date.now()) return { expired: true }
  return { jobId: m[1] }
}
