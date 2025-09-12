const stringSimilarity = require('string-similarity');

function normalizeUrl(raw) {
  if (!raw || typeof raw !== 'string') return '';
  try {
    // Make sure URL constructor always has a base
    const u = new URL(raw, 'http://dummy');

    // Remove fragment/hash
    u.hash = '';

    // Strip common tracking params
    const params = u.searchParams;
    const toRemove = [];
    for (const key of params.keys()) {
      if (/^utm_/i.test(key) || /^(fbclid|gclid|ref|mc_cid|mc_eid)$/i.test(key)) {
        toRemove.push(key);
      }
    }
    for (const k of toRemove) params.delete(k);

    // Final string
    let s = u.toString().replace(/\/$/, '');

    // Remove dummy base if we only had a relative URL
    if (s.startsWith('http://dummy')) {
      s = s.replace(/^http:\/\/dummy/, '');
    }

    return s.toLowerCase();
  } catch (e) {
    // Fallback for malformed URLs
    return raw.trim().replace(/\/$/, '').toLowerCase();
  }
}
function cleanText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .toLowerCase()
    .normalize('NFKD')                  // handle accents (e.g. "café" → "cafe")
    .replace(/[^\w\s]|_/g, '')          // remove punctuation/symbols
    .replace(/\s+/g, ' ')               // collapse multiple spaces
    .trim();
}

module.exports = { normalizeUrl, cleanText };