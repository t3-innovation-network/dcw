// eslint-disable-next-line no-undef
module.exports = function (api) {
  api.cache(true)
  return {
    presets: [
      [
        'babel-preset-expo',
        // @digitalbazaar/credentials-context (and other ESM context packages)
        // use `import.meta.url`, which Hermes does not support. This polyfill
        // rewrites it at build time.
        { jsxRuntime: 'automatic', unstable_transformImportMeta: true }
      ]
    ],
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
