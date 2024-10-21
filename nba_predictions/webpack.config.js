const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  entry: './src/index.js',  // Entry point for React
  output: {
    path: path.resolve(__dirname, 'static/js'),  // Output to static/js directory
    filename: 'bundle.js',  // Name of the output JS file
    publicPath: '/js/',  // URL path where Webpack will serve the bundle from
  },
  module: {
    rules: [
      {
        test: /\.js$/,  // Use Babel for JS/React
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,  // Process Tailwind CSS
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '../css/styles.css',  // Output for CSS
    }),
  ],
  devServer: {
    static: {
      directory: path.resolve(__dirname, 'public'),  // Serve index.html from public directory
    },
    hot: true,  // Enable Hot Module Replacement
    port: 8080,  // Port for Webpack Dev Server
  },
};
