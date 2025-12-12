import { useEffect, useState } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import quotesLib from 'success-motivational-quotes';
import stringHash from 'string-hash';
import { DEPLOY_VERSION, VERSION_CONFIG } from '../version.config';

type Quote = { body: string; by: string };

function pickQuote(visitorId: string): Quote {
  const all = quotesLib.getAllQuotes() as Quote[];
  const idx = Math.abs(stringHash(visitorId)) % all.length;
  return all[idx];
}

export default function App() {
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    // Check if current version is a redirect
    const config = VERSION_CONFIG[DEPLOY_VERSION];
    if (config.type === 'redirect') {
      window.location.href = config.url;
      return;
    }

    // Otherwise, load the motivational quote app
    (async () => {
      const fp = await FingerprintJS.load();
      const { visitorId } = await fp.get();
      setQuote(pickQuote(visitorId));
    })();
  }, []);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl bg-white/10 ring-1 ring-white/15 backdrop-blur-md shadow-2xl p-6 sm:p-10">

          {!quote ? (
            <div className="animate-pulse">
              <div className="h-6 w-2/3 bg-white/20 rounded mb-3"></div>
              <div className="h-6 w-5/6 bg-white/20 rounded mb-3"></div>
              <div className="h-6 w-3/4 bg-white/20 rounded mb-6"></div>
              <div className="h-4 w-32 bg-white/20 rounded"></div>
            </div>
          ) : (
            <div>
              <blockquote className="text-balance text-2xl sm:text-3xl leading-tight font-medium">
                “{quote.body}”
              </blockquote>
              <cite className="mt-4 sm:mt-6 block text-right text-white/80 text-sm sm:text-base">
                — {quote.by}
              </cite>
            </div>
          )}

          <footer className="mt-8 sm:mt-10 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-white/60">
              Deterministic per device. Refresh won’t change it.
            </span>
            <a
              href="https://qr.hakimalai.com"
              className="text-xs underline decoration-white/40 hover:decoration-white"
            >
              qr.hakimalai.com
            </a>
          </footer>
        </div>
      </div>
    </div>
  );
}
