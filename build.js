const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['main.js'],
  bundle: true,
  outfile: 'dist/bundle.js',
  minify: true,
  sourcemap: true,
  target: ['es2017'],
  platform: 'browser',
}).catch(() => process.exit(1));
