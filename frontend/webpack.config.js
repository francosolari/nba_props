const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

/**
 * `npm run build` passes `--mode production` without setting NODE_ENV, so the
 * mode argv has to be read too. Getting this wrong points publicPath at the
 * dev server, which the runtime chunk loader would then use in production.
 */
const resolveIsDevelopment = (argv) => {
  if (argv && argv.mode) return argv.mode !== 'production';
  return process.env.NODE_ENV !== 'production';
};

module.exports = (env, argv) => {
  const isDevelopment = resolveIsDevelopment(argv);

  return {
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
    // Page chunks are fetched by the webpack runtime, not named in a template,
    // so they carry a contenthash of their own to stay cache-safe across
    // deploys. collectstatic keeps these names alongside its hashed copies.
    chunkFilename: isDevelopment ? "[name].chunk.js" : "[name].[contenthash].chunk.js",
    publicPath: isDevelopment ? "http://localhost:8080/static/js/" : "/static/js/", // Served by Django's static at /static/js/
    clean: !isDevelopment, // Drop stale chunks so old hashes do not accumulate
  },
  optimization: {
    // Async only. The templates load bundle.js and nothing else, so splitting
    // the initial chunk would produce files no page ever requests.
    splitChunks: {
      chunks: "async",
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: "vendors",
          chunks: "async",
          priority: -10,
          reuseExistingChunk: true,
        },
        shared: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true,
        },
      },
    },
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
      {
        test: /\.(woff2?|ttf|otf)$/i,
        type: "asset/resource",
        generator: {
          filename: "../fonts/[name][ext]",
        },
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: "../css/styles.css", // Output for CSS
      // Every page stylesheet belongs in the entry above, so this should never
      // be used. It is named anyway: without it an async CSS chunk resolves to
      // a URL that does not exist and takes its whole page down with it.
      chunkFilename: isDevelopment
        ? "../css/[name].chunk.css"
        : "../css/[name].[contenthash].chunk.css",
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
};
