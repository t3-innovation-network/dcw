declare module 'json-canonicalize'
declare module 'rn-animated-ellipsis'
declare module 'validator'
declare module '@microsoft/msrcrypto'

declare module 'react-native-base64' {
  export function decode(input: string): string
  export function encode(input: string): string
  const base64: { decode: typeof decode; encode: typeof encode }
  export default base64
}

declare module '*.png'
declare module '*.json'
