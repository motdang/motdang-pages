// The team's board (/me/<token>, deals.mjs): Copy puts the Thai opener on the phone's clipboard.
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-copy]')
  if (!b) return
  const t = document.getElementById(b.dataset.copy)
  if (!t) return
  try { await navigator.clipboard.writeText(t.value) } catch (_) { t.focus(); t.select(); document.execCommand('copy') }
  b.textContent = '✓ คัดลอกแล้ว · Copied'
})
