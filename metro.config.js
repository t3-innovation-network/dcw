// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)

// Add support for Realm and other native modules
config.resolver.sourceExts.push('cjs')
config.resolver.assetExts.push('db')

// Ensure proper handling of native modules
config.resolver.platforms = ['ios', 'android', 'native', 'web']

// Handle ES modules properly
config.resolver.enablePackageExports = true
config.resolver.unstable_enablePackageExports = true
// 👇 Order matters: "react-native" first, then fallbacks
config.resolver.unstable_conditionNames = ['react-native', 'require']

// lru-cache@11 (pulled in via @interop/*) does an optional, .catch()-guarded
// `import('node:diagnostics_channel')` for metrics/tracing. RN has no Node
// builtins, so resolve it to an empty module — the guarded import no-ops.
const defaultResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === 'node:diagnostics_channel' ||
    moduleName === 'diagnostics_channel'
  ) {
    return { type: 'empty' }
  }
  return (defaultResolveRequest ?? context.resolveRequest)(
    context,
    moduleName,
    platform
  )
}

// Add support for Realm binary files
config.resolver.assetExts.push('realm')

module.exports = config
