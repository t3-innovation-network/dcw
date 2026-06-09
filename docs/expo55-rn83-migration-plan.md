# Migrate to Expo SDK 55 / React Native 0.83 (New Architecture)

> Status: completed. Headless verification done on the Linux dev box
> (install, doctor, tsc, jest, test-node all green). Device/simulator build and
> smoke test still owed (this box cannot run the RN app).

## Context

The wallet was on **Expo SDK 54 / RN 0.81.5 / React 19.1**, already running the
**New Architecture** (`newArchEnabled: true`). SDK 55 removes Legacy
Architecture support entirely and makes the New Architecture mandatory -- the
single biggest gate -- so the wallet was already past it. The earlier
`docs/expo54-rn81-migration-plan.md` flagged a future "SDK 55 effort" to drop
the unmaintained legacy native modules (`react-native-fs`,
`react-native-html-to-pdf`, `react-native-exit-app`, ...); that work was already
done by the time of this upgrade (none remain in `package.json`), which is why
this jump was clean.

**Outcome:** SDK 55 (RN 0.83.6 / React 19.2.0); app type-checks and passes all
tests with no behavior change.

## What made the app ready (no code changes needed)

- **New Architecture:** already on.
- **expo-file-system:** SDK 55 makes the `File`/`Directory`/`Paths` API the
  default export; the app already used it (`app/lib/import.ts`,
  `app/lib/shareData.ts`, `app/lib/svgToPdf.ts`, `app/init/logger.ts`,
  `app/model/DatabaseAccess.ts`).
- **Removed APIs:** no `expo-av`, `expo-video-thumbnails`, `removeSubscription`,
  `ExpoRequest`/`ExpoResponse`, `notification` config field, `edgeToEdgeEnabled`,
  or `expo-notifications` usage.
- **Edge-to-edge (Android):** already handled in the 53->54 upgrade.
- **Node:** dev box runs 24.10.0, within SDK 55's supported range.
- **RN 0.83** itself ships with no breaking changes.

## Steps taken

1. **`npx expo install expo@^55.0.0 --fix`** -- pinned every SDK-tracked package
   to its 55.x version (all `expo-*`, `react-native@0.83.6`, `react@19.2.0`,
   `react-dom@19.2.0`, `react-native-web@~0.21`, `react-native-screens@~4.23`,
   `react-native-gesture-handler@~2.30`, `react-native-svg@15.15.3`,
   `jest-expo@~55`, `@types/react@~19.2`).
2. **Fixed package.json fallout from `--fix`:** the `pnpm add --save-dev` step
   pulled `react` / `react-native` out of `dependencies` -- restored both there
   (`react@19.2.0`, `react-native@0.83.6`); bumped `react-test-renderer` to
   `19.2.0` to match.
3. **`app.config.js`:** removed the now-invalid `newArchEnabled: true` flag.
   Android `compileSdk`/`targetSdk 36`, `minSdk 29`, iOS `deploymentTarget 15.1`
   already satisfy SDK 55 floors. `babel.config.js` / `metro.config.js`
   unchanged.
4. **`pnpm-workspace.yaml`:** bumped the React / `@types/react` overrides to
   `^19.2.0` / `~19.2.17`. The `@interop/*` pins and `minimumReleaseAgeExclude`
   were untouched.
5. **`.tool-versions`:** Node `18.16.0` -> `24.10.0` (matches the box and the
   SDK 55 floor).
6. **Deliberate version holds:**
   - `react-native-vision-camera` kept at **4.7.3** -- v5 is a Nitro rewrite with
     a breaking camera API (Formats API removed; `usePhotoOutput()` /
     `useVideoOutput()` hooks); 4.7.3 already supports RN 0.83 and the app only
     uses the code scanner.
   - `react-native-get-random-values` moved to Expo's tested **^1.11.0** (was
     `^2.0.0`); used only as a side-effect polyfill, API identical.

## Gotchas hit

- **Stale `node_modules` after incremental `expo install` runs** -- expo-doctor
  reported `metro@0.83.3` while the lockfile and a clean tree both resolve
  `0.83.7`. Leftover nested `metro@0.83.3` dirs (under `@expo/metro` and
  `metro-transform-worker`) survived the incremental installs. Fix: `rm -rf
  node_modules && pnpm install` (lockfile unchanged -- it was already correct).
- **`react-native-securerandom`** (unmaintained, untested-on-New-Arch) is a deep
  transitive dep of `@interop/did-web-resolver` (`@digitalcredentials/bnid`), not
  something we control. Added to `expo.doctor.reactNativeDirectoryCheck.exclude`
  in `package.json` per the doctor's own advice.

## Verification

Headless (all green): `npx expo-doctor` (19/19), `npm run compile`,
`npm run test-jest` (50 suites / 383 tests), `npm run test-node` (11 / 42).

Still owed on a Mac / Android box / CI: `npm run prebuild:ios` /
`prebuild:android`, then build + launch and smoke-test the **QR scanner**
(VisionCamera code scanner), credential import (file + deep link), WAS backup,
and Android edge-to-edge layout.
