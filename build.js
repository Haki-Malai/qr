const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

esbuild.build({
  entryPoints: ['main.js'],
  bundle: true,
  outfile: 'dist/bundle.js',
  minify: true,
  sourcemap: true,
  target: ['es2017'],
  platform: 'browser'
}).then(() => {
  fs.mkdirSync('dist', { recursive: true });
  fs.copyFileSync('index.html', path.join('dist', 'index.html'));
  if (fs.existsSync('CNAME')) fs.copyFileSync('CNAME', path.join('dist', 'CNAME'));
});
