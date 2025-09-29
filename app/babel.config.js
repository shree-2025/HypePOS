module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-paper/babel',
      ['module-resolver', {
        root: ['./'],
        alias: {
          '@': './src'
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json']
      }]
    ]
  };
}
