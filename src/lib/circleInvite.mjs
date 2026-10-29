export function circleInviteCode(value, origin = 'https://shorecan.github.io') {
  const input = String(value || '').trim();
  if (!input) return null;
  let code = input;
  if (/^https?:/i.test(input) || input.startsWith('/')) {
    try {
      const url = new URL(input, origin);
      if (!new Set([origin, 'https://shorecan.github.io']).has(url.origin)) return null;
      const match = /^\/courtstreak-site\/training-circles\/join\/([^/]+)\/?$/.exec(url.pathname);
      if (!match) return null;
      code = decodeURIComponent(match[1]);
    } catch { return null; }
  }
  return /^[a-zA-Z0-9_-]{1,512}$/.test(code) ? code : null;
}
