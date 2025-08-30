const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  context: path.resolve(__dirname), // Make all relative paths resolve from frontend/
  entry: "./src/index.jsx", // Entry point for React (relative to frontend/)
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  resolve: {
    extensions: [".tsx", ".ts", ".js", ".jsx"],
  },
  resolveLoader: {
    // Allow loaders to resolve from frontend/node_modules if present
    modules: [path.resolve(__dirname, 'node_modules'), 'node_modules'],
  },
  output: {
    path: path.resolve(__dirname, "static/js"), // Output to frontend/static/js
    filename: "bundle.js", // Name of the output JS file
    publicPath: "/static/js/", // Served by Django's static at /static/js/
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            babelrc: false,
            configFile: false,
            presets: [
              require.resolve("@babel/preset-env"),
              require.resolve("@babel/preset-react"),
              require.resolve("@babel/preset-typescript"),
            ],
          },
        },
      },
      {
        test: /\.css$/, // Process Tailwind CSS
        use: [
          MiniCssExtractPlugin.loader,
          "css-loader",
          {
            loader: "postcss-loader",
            options: {
              postcssOptions: {
                config: path.resolve(__dirname, "postcss.config.js"),
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "../css/styles.css", // Output for CSS
    }),
  ],
  devServer: {
    static: {
      directory: path.resolve(__dirname, "public"), // Serve index.html from public directory
    },
    hot: true, // Enable Hot Module Replacement
    port: 8080, // Port for Webpack Dev Server
  },
};
