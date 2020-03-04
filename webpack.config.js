const path = require('path');

module.exports = {
  entry: './src/main.js',
  mode: 'production',
  output: {
    filename: 'paper-buttons-row.js',
    path: path.resolve(__dirname, "dist")
  }
};
