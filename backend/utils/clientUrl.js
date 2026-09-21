// Email links must work on the recipient's device, not just the server's PC.
const getClientUrl = (env = process.env) => {
  const candidates = [env.CLIENT_URL, ...(env.FRONTEND_URL || '').split(',')]
    .filter(Boolean)
    .map(value => value.trim())
    .filter(Boolean)
    .map(value => {
      try {
        const url = new URL(value);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
        return url;
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  const isLoopback = url => url.hostname === 'localhost' || url.hostname.endsWith('.localhost') ||
    /^127\./.test(url.hostname) || ['[::1]', '0.0.0.0'].includes(url.hostname);
  const selected = candidates.find(url => !isLoopback(url));
  if (selected) return selected.href.replace(/\/$/, '');
  if (env.NODE_ENV === 'production') {
    throw new Error('Configure CLIENT_URL with the public frontend URL before sending account emails.');
  }
  return candidates[0]?.href.replace(/\/$/, '') || 'http://localhost:5173';
};

module.exports = getClientUrl;
