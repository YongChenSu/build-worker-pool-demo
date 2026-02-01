const path = require("path");
const os = require("os");

module.exports = {
  mode: "production",
  entry: "./phase2-build/src/app.js",
  output: {
    path: path.resolve(__dirname, "../../dist/webpack-workers"),
    filename: "bundle.js",
  },
  resolve: {
    extensions: [".js", ".jsx"],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "thread-loader",
            options: {
              workers: os.cpus().length - 1,
              workerParallelJobs: 50,
              poolTimeout: 2000,
            },
          },
          {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env", "@babel/preset-react"],
            },
          },
        ],
      },
    ],
  },
};
