/** @type {import('postcss').PluginCreator} */
module.exports = {
  postcssPlugins: [
    require('autoprefixer'),
    require('tailwindcss'),
  ],
};