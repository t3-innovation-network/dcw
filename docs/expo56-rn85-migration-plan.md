# Migrate to Expo SDK 56 / React Native 0.85 (New Architecture)

> Status: completed (headless). Install, expo-doctor (21/21), tsc, jest, and
> test-node all green on the Linux dev box. Device/simulator build and smoke
> test still owed (this box cannot run the RN app).

## Context

The wallet was on **Expo SDK 55 / RN 0.83.6 / React 19.2.0**, already on the
mandatory New Architecture. SDK 56 is a routine cadence bump: RN 0.83.6 to
**0.85.3**, React 19.2.0 to **19.2.3**, and every `expo-*` module to its 56.x
line. As with the 54-to-55 jump, the New-Arch gate was already behind us, so the
work was mostly version bumps plus one small RN 0.85 API change.

**Outcome:** SDK 56 (RN 0.85.3 / React 19.2.3); app type-checks and passes all
tests, with a single code change (`StyleSheet.absoluteFillObject` removal).

## Target versions

Taken from `expo@56.0.9`'s `bundledNativeModules.json`:

| Package                          | 55.x      | 56.x      |
| -------------------------------- | --------- | --------- |
| expo                             | ^55.0.26  | ^56.0.9   |
| react-native                     | 0.83.6    | 0.85.3    |
| react / react-dom                | 19.2.0    | 19.2.3    |
| react-test-renderer              | 19.2.0    | 19.2.3    |
| all `expo-*` modules             | ~55.x     | ~56.x     |
| react-native-screens             | ~4.23.0   | 4.25.2    |
| react-native-safe-area-context   | 5.6.2     | ~5.7.0    |
| react-native-gesture-handler     | ~2.30.1   | ~2.31.1   |
| react-native-svg                 | 15.15.3   | 15.15.4   |
| jest-expo                        | ~55.0.18  | ~56.0.4   |

`@react-native-async-storage/async-storage@2.2.0` already matched SDK 56;
`@expo/vector-icons@^15.1.1` and `react-native-web@^0.21.2` already satisfied
the SDK 56 ranges, so neither was touched.

## The one code change: `StyleSheet.absoluteFillObject` removed

RN 0.85 refactored `StyleSheet` to delegate to an internal `StyleSheetExports`
module and **dropped `StyleSheet.absoluteFillObject`** (gone from both the
runtime and the type definitions; only `absoluteFill` remains). In 0.85
`absoluteFill` is itself the frozen plain object
(`{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }`) that
`absoluteFillObject` used to be -- it is no longer a registered style id -- so
`...StyleSheet.absoluteFill` is a byte-identical drop-in for the old
`...StyleSheet.absoluteFillObject` spread. Changed in three files:

- `app/screens/QRScreen/QRScreen.tsx`
- `app/components/ConfirmModal/ConfirmModal.style.ts`
- `app/components/OutlinedTextInput/OutlinedTextInput.styles.ts`

## Steps taken

1. **`package.json`:** bumped `expo`, every `expo-*` module, `react-native`,
   `react`/`react-dom`/`react-test-renderer`, `react-native-screens`,
   `react-native-safe-area-context`, `react-native-gesture-handler`,
   `react-native-svg`, and `jest-expo` to the 56.x versions above.
2. **Clean install** (`rm -rf node_modules && pnpm install`) per the SDK 55
   gotcha about stale nested `metro` dirs. The clean reinstall re-resolved the
   lockfile (see Gotchas).
3. **`pnpm-workspace.yaml`:** bumped the React overrides `^19.2.0` to `^19.2.3`,
   and added `'@interop/data-integrity-core': 6.4.0` to the `@interop` override
   pins (see Gotchas). `msgpackr-extract` (a new transitive native-build script
   pulled in by the SDK 56 toolchain) was set to `false` in `allowBuilds` -- it
   falls back to pure JS without its build, matching the project's conservative
   policy.
4. **Fixed `StyleSheet.absoluteFillObject`** in the three files above.
5. **`package.json` -> `expo.install.exclude`:** added `typescript` and
   `react-native-get-random-values` so expo-doctor passes 21/21 despite the two
   deliberate version holds.
6. **Deliberate version holds (unchanged from SDK 55):**
   - `react-native-vision-camera` kept at **4.7.3** -- v5 is a Nitro rewrite with
     a breaking camera API; the app only uses the native code scanner
     (`useCodeScanner`), which 4.7.3 supports.
   - `react-native-worklets-core` was **removed** -- it was only a wildcard
     peer of VisionCamera (needed for JS frame processors, which the app does
     not use; it uses the native code scanner) and was imported by no app code.
     Because VisionCamera marks it `optional: true` but pnpm's `autoInstallPeers`
     pulls optional peers in anyway, it is listed under
     `peerDependencyRules.ignoreMissing` in `pnpm-workspace.yaml` to keep it out
     of the tree. Applying that rule required a full lockfile re-resolution
     (`rm -rf node_modules pnpm-lock.yaml && pnpm install`) -- a plain
     `pnpm install` / `--force` reports "Already up to date" and will not drop an
     already-locked optional peer. The `@interop/data-integrity-core` pin held
     across the regen (still a single 6.4.0 copy).
   - `react-native-get-random-values` kept at `^2.0.0` (SDK 56 tested ~1.11.0) --
     a side-effect-only `getRandomValues` polyfill, identical API.
   - `typescript` kept at `~5.9.3` (SDK 56 recommends ~6.0.3) -- TS 6.0 is a
     major and is a separate, deliberate upgrade; the project compiles green on
     5.9.3.
7. **`app.config.js` / `babel.config.js` / `metro.config.js`:** unchanged. The
   Android `compileSdk`/`targetSdk 36` / `minSdk 29` and iOS `deploymentTarget
   15.1` floors still satisfy SDK 56. The babel
   `unstable_transformImportMeta` polyfill is still required and still supported.
8. **`.tool-versions`:** unchanged (Node 24.10.0; SDK 56 declares no Node
   `engines` floor and 24.x is within range).

## Gotchas hit

- **Lockfile re-resolution split `@interop/data-integrity-core`.** The clean
  reinstall (forced by the package.json bumps) re-resolved the whole graph under
  `minimumReleaseAge`, which pinned the direct dep to **6.4.0** but every
  transitive `^6.1.0` ref to the older **6.1.2**. That dual install produced the
  documented duplicate-class TS errors (separate `IVerifiablePresentation` /
  `IVerificationKeyPair2020` declarations in `present.ts`, `composeVp.ts`,
  `profile.ts`). Fix: add `'@interop/data-integrity-core': 6.4.0` to the
  `pnpm-workspace.yaml` overrides (6.4.0 was already in
  `minimumReleaseAgeExclude`). The next `pnpm install` removed 65 redundant
  packages and collapsed to a single 6.4.0 copy. This is the same class of
  problem the existing `@interop` override pins guard against -- SDK 56 just
  surfaced one more package that needed pinning.
- **New `msgpackr-extract` build-script prompt.** pnpm wrote a
  `msgpackr-extract: set this to true or false` placeholder into `allowBuilds`;
  set to `false` (pure-JS fallback, no native build needed).

## Verification

Headless (all green): `npx expo-doctor` (21/21), `npm run compile`,
`npm run test-jest` (49 suites / 379 tests), `npm run test-node`
(12 suites / 46 tests).

Still owed on a Mac / Android box / CI: `npm run prebuild:ios` /
`prebuild:android`, then build + launch and smoke-test the **QR scanner**
(VisionCamera code scanner -- the one screen touched by a code change),
credential import (file + deep link), WAS backup, and Android edge-to-edge
layout.
