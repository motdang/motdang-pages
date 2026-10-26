// entry.mjs — the deployed entry (wrangler.toml main): the Worker in worker.mjs, plus the door motdang-line uses for
// Edit by LINE (lineedit.mjs). A class of its own, reached only through a service binding (entrypoint LineEdit), so it
// has no public address. Tests import worker.mjs and lineedit.mjs, which do not load cloudflare:workers.
import { WorkerEntrypoint } from 'cloudflare:workers'
import worker, { rand, sha } from './worker.mjs'
import * as line from './lineedit.mjs'

export class LineEdit extends WorkerEntrypoint {
  confirm(uid, code, name) { return line.confirm(this.env, uid, code, name, { sha }) }
  status(uid) { return line.status(this.env, uid) }
  unlink(uid) { return line.unlink(this.env, uid) }
  note(uid, text, msg) { return line.addNote(this.env, uid, text, msg, { rand }) }
  photo(uid, bytes, msg) { return line.addPhoto(this.env, uid, bytes, msg, { rand }) }
}

export default worker
