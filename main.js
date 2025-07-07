import FingerprintJS from '@fingerprintjs/fingerprintjs';
import quotesLib from 'success-motivational-quotes';

async function sha256Hex (str) {
  const data = new TextEncoder().encode(str);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function showMotivationalQuote () {
  const fp = await FingerprintJS.load();
  const { visitorId } = await fp.get();
  const quotes = quotesLib.getAllQuotes();
  const hex    = await sha256Hex(visitorId);
  const idx    = parseInt(hex.slice(0, 8), 16) % quotes.length;
  const q      = quotes[idx];
  alert(`${q.body} — ${q.by}`);
}

(async () => {
  await showMotivationalQuote();
})();
