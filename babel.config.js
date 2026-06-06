// eslint-disable-next-line no-undef
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            stream: 'stream-browserify',
            // TODO use Url from expo? https://docs.expo.dev/versions/unversioned/sdk/url/
            'whatwg-url': 'react-native-url-polyfill'
          }
        }
      ]
    ]
  }
}
