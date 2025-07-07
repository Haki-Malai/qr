import FingerprintJS from '@fingerprintjs/fingerprintjs';
import quotesLib from 'success-motivational-quotes';
import stringHash from 'string-hash';

async function showMotivationalQuote() {
  const fp = await FingerprintJS.load();
  const { visitorId } = await fp.get();
  const quotes = quotesLib.getAllQuotes();
  const idx = stringHash(visitorId) % quotes.length;
  const { body, by } = quotes[idx];
  alert(`${body} — ${by}`);
  window.open('', '_self');
  window.close();
}

(async () => {
  await showMotivationalQuote();
})();
