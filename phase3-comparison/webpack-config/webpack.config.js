const path = require("path");

module.exports = {
  mode: "production",
  entry: "./phase2-build/src/app.js",
  output: {
    path: path.resolve(__dirname, "../../dist/webpack-normal"),
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
        use: {
          loader: "babel-loader",
          options: {
            presets: ["@babel/preset-env", "@babel/preset-react"],
          },
        },
      },
    ],
  },
};
