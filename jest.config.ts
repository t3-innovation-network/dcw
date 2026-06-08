import type { Config } from 'jest'

const packagesToTransformWithBabel = [
  '@react-native',
  'react-native',
  'expo-secure-store',
  'expo-modules-core',
  'expo-font',
  'expo-file-system',
  '@digitalcredentials/http-client',
  'react-redux',
  '@reduxjs/toolkit',
  '@testing-library/react-native',
  '@expo/vector-icons',
  'immer',
  'react-native-outside-press',
  '@noble/hashes', // ESM-only (type: module); used by app/lib/cid.ts
  '@scure/base', // ESM-only (type: module); used by app/lib/cid.ts
  'yaml' // RN preset resolves yaml to its ESM browser build; transpile it
]

const transformIgnorePatterns = [
  `/node_modules/(?!(${packagesToTransformWithBabel.join('|')}))`
]

const config: Config = {
  preset: 'react-native',
  testPathIgnorePatterns: ['test-node/'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest'
  },
  transformIgnorePatterns,
  moduleNameMapper: {
    '\\.(jpg|jpeg|png|svg)$': '<rootDir>/__mocks__/fileMock.js',
    // @noble/hashes v2 is ESM-only ("type": "module"); jest's CJS runtime can't
    // load it. Redirect to a CJS shim backed by Node's real crypto.
    '^@noble/hashes/(?:sha2|pbkdf2|utils)(?:\\.js)?$':
      '<rootDir>/test/shims/noble-hashes.cjs'
  },
  setupFiles: ['<rootDir>/jest.setup.js']
  // Coverage disabled for default test runs - use jest.config.coverage.ts for coverage
}

export default config
