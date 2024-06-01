const path = require('path');

const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const env = process.env.NODE_ENV;

const configs = [
  // CommonJS configuration
  {
    entry: './src/index.ts',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
      ],
    },
    plugins: [
    ],
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        // Add your aliases here
        "@nestjs/graphql": path.resolve(__dirname, "node_modules/@nestjs/graphql/dist/extra/graphql-model-shim")
      },
      fallback: {
        os: require.resolve("os-browserify/browser"),
        "fs": false,
        "tls": false,
        "tty": false,
        "net": false,
        "path": false,
        "zlib": false,
        "http": false,
        "https": false,
        "stream": false,
        "crypto": false,
        "async_hooks": false,
        "child_process": false
      },
    },
    output: {
      filename: 'index.js', // Output filename for CJS
      path: path.resolve(__dirname, 'build', 'main'),
      library: {
        type: 'commonjs', // Specify CJS format
      },
    },
  },
  // ESM configuration
  {
    entry: './src/index.ts',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
      ],
    },
    plugins: [
    ],
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
      alias: {
        // Add your aliases here
        "@nestjs/graphql": path.resolve(__dirname, "node_modules/@nestjs/graphql/dist/extra/graphql-model-shim")
      },
      fallback: {
        os: require.resolve("os-browserify/browser"),
        "fs": false,
        "tls": false,
        "tty": false,
        "net": false,
        "path": false,
        "zlib": false,
        "http": false,
        "https": false,
        "stream": false,
        "crypto": false,
        "async_hooks": false,
        "child_process": false
      },
    },
    output: {
      filename: 'index.js', // Output filename for ESM (can use .js for modern browsers)
      path: path.resolve(__dirname, 'build', 'module'),
      library: {
        type: 'module', // Specify ESM format
      },
    },
    experiments: { outputModule: true }
  },
];
if (env === 'analyse') {
  for (let config of configs) {
    config.plugins.push(new BundleAnalyzerPlugin());
  }
}

module.exports = configs;