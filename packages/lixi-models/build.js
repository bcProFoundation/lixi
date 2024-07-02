const { build } = require("esbuild");
const { Generator } = require('npm-dts');

const { dependencies, peerDependencies } = require('./package.json')
new Generator({
  entry: 'src/index.ts',
  output: 'build/types/index.d.ts',
}).generate();
const sharedConfig = {
  entryPoints: ["src/index.ts"],
  bundle: true,
  minify: true,
  external: Object.keys(dependencies).concat(Object.keys(peerDependencies)),
};
build({
  ...sharedConfig,
  platform: 'node', // for CJS
  outfile: "build/main/index.js",
  target: "es6"
});
build({
  ...sharedConfig,
  outfile: "build/module/index.mjs",
  platform: 'neutral', // for ESM
  format: "esm",
  target: "ES2017"
});
