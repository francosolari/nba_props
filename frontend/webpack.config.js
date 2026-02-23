const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

const isDevelopment = process.env.NODE_ENV !== 'production';

module.exports = {
  context: path.resolve(__dirname), // Make all relative paths resolve from frontend/
  entry: "./src/index.jsx", // Entry point for React (relative to frontend/)
  mode: isDevelopment ? 'development' : 'production',
  devtool: isDevelopment ? 'eval-source-map' : 'source-map',
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
    publicPath: isDevelopment ? "http://localhost:8080/static/js/" : "/static/js/", // Served by Django's static at /static/js/
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
      directory: path.resolve(__dirname, "static"), // Serve static files
    },
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    hot: true, // Enable Hot Module Replacement
    liveReload: true, // Enable live reload
    port: 8080, // Port for Webpack Dev Server
    open: false, // Don't auto-open browser
    compress: true,
    historyApiFallback: false, // Django handles routing
    devMiddleware: {
      writeToDisk: true, // Write files to disk so Django can serve them
    },
    watchFiles: {
      paths: ['src/**/*', '../backend/predictions/templates/**/*'],
      options: {
        usePolling: false,
      },
    },
    client: {
      webSocketURL: {
        hostname: 'localhost',
        port: 8080,
      },
      overlay: {
        errors: true,
        warnings: false,
      },
      progress: true,
    },
  },
  watchOptions: {
    ignored: /node_modules/,
    aggregateTimeout: 300,
    poll: false,
  },
};
