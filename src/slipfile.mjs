// slipfile.mjs — a bank slip is a photo. Its type comes from its first bytes (JPEG, PNG, WebP, HEIC), not from what the
// browser says, and a stored slip goes back out with headers that leave nothing in it to run (CodeRabbit on #72).

/** The picture type of these bytes, or null when they are not a photo a phone takes or a bank app saves. */
export function rasterType(buf) {
  const b = new Uint8Array(buf instanceof ArrayBuffer ? buf.slice(0, 16) : buf.subarray(0, 16))
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png'
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp'
  if (/^ftyp(heic|heix|hevc|mif1|msf1)/.test(String.fromCharCode(...b.slice(4, 12)))) return 'image/heic'
  return null
}

/** Headers for a stored slip: a picture type or a plain download, no sniffing, no script, no frames. */
export const slipHeaders = (type) => ({
  'content-type': /^image\/(jpeg|png|webp|heic)$/.test(type || '') ? type : 'application/octet-stream',
  'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; sandbox", 'cache-control': 'no-store',
})
