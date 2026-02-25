const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';

  return {
    entry: {
      popup: './src/popup/popup.ts',
      background: './src/background/background.ts',
      content: './src/content/content.ts'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: true
    },
    mode: isProduction ? 'production' : 'development',
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.json',
              transpileOnly: true
            }
          },
          exclude: /node_modules/
        }
      ]
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    devtool: isProduction ? false : 'source-map',
    optimization: {
      minimize: isProduction
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'manifest.json', to: '.' },
          { from: 'popup.html', to: '.' },
          { from: 'popup.css', to: '.' },
          { from: 'icons', to: 'icons', noErrorOnMissing: true }
        ]
      })
    ]
  };
};
