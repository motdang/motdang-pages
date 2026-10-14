// line.mjs — a note to Beer on LINE when a Gold slip waits for a person
// (Nan 2026-10-14, QUEUE C191 (c)). Sent as the Mot Dang Official Account
// (@964yxgnk). LINE delivers a direct message only to someone who has added
// the account as a friend; until Beer has, the note goes to the team room
// with her name on it. Pushes are metered (500 a month on this plan).

const API = 'https://api.line.me/v2/bot/message/push'

async function push(env, to, text) {
  try {
    const r = await fetch(API, {
      method: 'POST',
      headers: { authorization: 'Bearer ' + env.LINE_TOKEN, 'content-type': 'application/json' },
      body: JSON.stringify({ to, messages: [{ type: 'text', text: text.slice(0, 4900) }] }),
    })
    return r.ok
  } catch { return false }
}

/** 'dm' | 'room' | 'off' | 'failed' */
export async function tellBeer(env, text) {
  if (!env.LINE_TOKEN) return 'off'
  if (env.BEER_LINE && (await push(env, env.BEER_LINE, text))) return 'dm'
  if (env.TEAM_LINE && (await push(env, env.TEAM_LINE, 'Beer · ' + text))) return 'room'
  return 'failed'
}
