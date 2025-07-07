import FingerprintJS from '@fingerprintjs/fingerprintjs';

const urls = [
  'https://www.youtube.com/watch?v=dQw4w9gXcQ'
];

(async () => {
  const fp = await FingerprintJS.load();

  const result = await fp.get();

  const visitorId = result.visitorId;

  alert(`Visitor ID: ${visitorId}`);

  const target = urls[Math.floor(Math.random() * urls.length)];
  window.location.replace(target);
})();
