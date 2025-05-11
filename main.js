const urls = [
  'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
];

const target = urls[Math.floor(Math.random() * urls.length)];
window.location.replace(target);
