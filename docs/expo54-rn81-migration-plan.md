# Migrate to Expo SDK 54 / React Native 0.81 (legacy architecture)

> Status: planned, not yet implemented. To be executed in a separate session.

## Context

The wallet is on **Expo SDK 53 / RN 0.79 / React 19.0**, running the **legacy
RN architecture** (`newArchEnabled: false` is set explicitly in
`app.config.js`). This plan takes the next major step.

**Decision:** upgrade **one major step, to SDK 54 (RN 0.81, React 19.1), and
stay on the legacy architecture.** SDK 54 is the *last* SDK that supports
`newArchEnabled: false`; SDK 55+ (RN 0.83) is New-Architecture-only. Staying on
legacy keeps the app's unmaintained native modules (`react-native-fs`,
`react-native-html-to-pdf`, `react-native-exit-app`,
`react-native-keyboard-aware-scroll-view`) working untouched. Migrating to the
New Architecture and replacing those modules is a **separate future SDK 55
effort** (note: SDK 54 + legacy arch is a deliberate dead-end at SDK 55).

**Outcome:** the app builds, type-checks, and passes tests on SDK 54 with no
behavior change, on the same legacy architecture.

> Note: the Linux dev box cannot run the Expo/RN app. All device/simulator
> verification is done by the user; this plan verifies everything that can run
> headless (install, doctor, tsc, jest, test-node, export/prebuild dry runs).

## Approach

Let Expo drive the version bumps rather than hand-pinning. The project already
has `fix-deps` (`expo install --check`); lean on `expo install` for correct
SDK 54 versions and only hand-edit what Expo cannot infer (native build config,
pnpm overrides, patch filenames).

### 1. Bump the SDK and let Expo align dependencies

- `package.json`: bump `expo` to `^54.0.0`, then run `npx expo install --fix`
  to let Expo set RN 0.81, React 19.1, and the correct versions of every
  `expo-*` and Expo-managed RN package (`react-native-screens`,
  `react-native-safe-area-context`, `react-native-gesture-handler`,
  `react-native-svg`, `expo-sqlite`, `expo-secure-store`, `expo-crypto`, etc.).
- Bump dev/test toolchain Expo will not touch: `jest-expo` to `~54.0.x`, and
  the duplicated `react` / `react-dom` / `react-test-renderer` pins in
  `devDependencies` from `19.0.0` to the React version Expo selects (19.1.x).
- Keep `react-redux`, `@reduxjs/toolkit`, `@testing-library/react-native`,
  `typescript`, `tsx`, `prettier`, `patch-package` as-is unless `expo-doctor`
  flags them.
- **Do not bump the app `version`** in `package.json` -- only the `expo` / RN /
  React dependency versions.

### 2. Update pnpm overrides for the React 19.1 bump

`pnpm-workspace.yaml` pins React / @types/react to `^19.0.0` / `~19.0.10` across
`react-redux`, `@reduxjs/toolkit`, `react-native`,
`@react-native/virtualized-lists`. Bump these to the 19.1 line (`^19.1.0` /
`~19.1.x`) to match what `expo install` selects, so there is a single React
copy. Leave the `@interop/*` pins and `minimumReleaseAgeExclude` untouched (no
@interop change in this upgrade). If a lockfile / `minimumReleaseAge`
verification error appears, stop and hand it to the user.

### 3. Update native build config (`app.config.js` + expo-build-properties)

SDK 54 raises platform floors. In the `expo-build-properties` plugin config:

- **Android:** `compileSdkVersion: 36`, `targetSdkVersion: 36`,
  `buildToolsVersion: '36.0.0'` (from 35 / 35 / `34.0.0`). Keep
  `minSdkVersion: 29` unless doctor objects. Keep
  `pickFirst: ['**/libcrypto.so']`.
- **iOS:** `deploymentTarget: '15.1'` (from `13.0`) -- RN 0.81 minimum.
- **Keep `newArchEnabled: false`** in both the `ios` and `android` blocks --
  this is the whole point of the chosen path.
- **Android edge-to-edge is forced on in SDK 54 and cannot be disabled.** This
  is the most likely visual regression. No config change, but flag for device
  testing: screens that draw under the status/navigation bars. The app already
  uses `react-native-safe-area-context` and a `SafeScreenView` component
  (`app/components/SafeScreenView/SafeScreenView.tsx`); verify insets there
  after upgrade.

### 4. Re-validate patch-package patches

The three patches in `patches/` target packages that are **not** Expo-managed,
so `expo install --fix` should leave their versions alone and the patches should
still apply:

- `react-native-document-picker+9.3.1.patch` (Android `GuardedResultAsyncTask`)
- `react-native-keychain+8.2.0.patch` (`build.gradle` Java 1.8 compat)
- `react-native-paper+4.12.8.patch` (`TextInputOutlined.tsx` multiline)

After install, confirm the installed versions still match the patch filenames
and that `postinstall` (`patch-package`) applies cleanly. If a version drifted,
regenerate the patch against the new version (do **not** silently drop it).
Watch the document-picker patch most closely: it uses a deprecated RN bridge
class; if RN 0.81 removed it, regenerate or migrate (swapping the library is out
of scope here).

### 5. Re-check the build/runtime shims after install

These are fragile across SDK bumps; verify, do not assume:

- `babel.config.js` -- `babel-preset-expo` with
  `unstable_transformImportMeta: true` (needed for
  `@digitalbazaar/credentials-context` `import.meta`). Confirm the flag still
  exists in SDK 54's preset; if renamed/stabilized, adjust.
- `metro.config.js` -- custom `resolveRequest` (maps `node:diagnostics_channel`
  to empty), `unstable_enablePackageExports`, `unstable_conditionNames`. Re-test
  resolution after the Metro bump.
- `jest` ESM mapping -- `@noble/hashes` v2 CJS shim
  (`test/shims/noble-hashes.cjs`) and the `transformIgnorePatterns` lists in
  `jest.config.ts` / `jest.config.coverage.ts`. RN 0.81 may shift which packages
  need Babel transform; extend the list if jest hits ESM syntax errors.
- `shim.js` -- `Buffer`, `crypto.subtle.digest` via `expo-crypto`, `btoa`,
  `structuredClone`. Keep as-is; just re-confirm `expo-crypto`'s API is
  unchanged.

### 6. Optional cleanup: drop `react-native-securerandom` for `react-native-get-random-values` -- DONE

> **Status: done.** Both call sites now use `crypto.getRandomValues`, the direct
> dependency and the `test/import.test.ts` mock are removed. **Caveat:**
> `react-native-securerandom` could not be fully dropped -- it is still pulled in
> transitively by `@digitalcredentials/bnid` (via `@interop/did-web-resolver`),
> so it stays in the `expo.doctor.reactNativeDirectoryCheck.exclude` list and the
> native module is still autolinked. The cleanup removed our *direct* use of it,
> not the package itself.

Independent of the SDK bump, but worth doing in the same pass: replace the
unmaintained `react-native-securerandom` (which is in the `expo-doctor` exclude
list and has no New-Architecture support) with the already-installed,
better-maintained `react-native-get-random-values` polyfill. This removes one
native module and slightly reduces the future SDK 55 workload.

Only two call sites use it, both just needing N secure random bytes as a
`Uint8Array`:

- `app/model/DatabaseAccess.ts:200` -- 64-byte PBKDF2 salt
- `app/model/profile.ts:100` -- 32-byte DID seed (passed to `mintDid({ seed })`)

`react-native-get-random-values` (imported in `index.js:2`, after `shim.js`)
installs `crypto.getRandomValues` globally, so the swap is:

```ts
// before
import { generateSecureRandom } from 'react-native-securerandom'
const rawSalt = await generateSecureRandom(64)

// after (synchronous, drop the await + the import)
const rawSalt = crypto.getRandomValues(new Uint8Array(64))
```

Then:

- Remove `react-native-securerandom` from `package.json` dependencies and from
  the `expo.doctor.reactNativeDirectoryCheck.exclude` list in `package.json`.
- Remove its mock in `test/import.test.ts` (lines 18-20); Node provides
  `crypto.getRandomValues` natively in the jest environment, so no replacement
  mock is needed.
- Update the comment in `shim.js` if it specifically references securerandom.

This is low-risk and self-contained. It can be done before, during, or after the
SDK bump; folding it into this PR keeps the native-module surface smaller.

### 7. Toolchain prerequisites (environment, not code)

SDK 54 requires **Node >= 20.19.4**, **Xcode >= 16.1** (recommended 26), and the
Android SDK for **API 36**. Node is the only one relevant on the dev box for
headless verification; the Xcode / Android requirements are on the build
machine. Prepare CI/build agents accordingly.

## Files to modify

- `package.json` -- `expo` `^54.0.0`; `jest-expo` `~54`; react / react-dom /
  react-test-renderer 19.0.0 to 19.1.x; remove `react-native-securerandom`
  (step 6); plus whatever `expo install --fix` rewrites.
- `pnpm-workspace.yaml` -- React / @types/react overrides to the 19.1 line.
- `app.config.js` -- expo-build-properties Android `compileSdk` / `targetSdk` /
  `buildToolsVersion` to 36, iOS `deploymentTarget` to `15.1`; keep
  `newArchEnabled: false`.
- `app/model/DatabaseAccess.ts`, `app/model/profile.ts`, `test/import.test.ts`,
  `shim.js` -- the securerandom swap (step 6).
- `patches/*.patch` -- only if installed versions drift (regenerate, do not
  drop).
- Possibly `babel.config.js` / `metro.config.js` / `jest.config*.ts` -- only the
  minimal edits needed if step 5 surfaces a break.
- `pnpm-lock.yaml` -- regenerated by `pnpm install` (do not hand-edit).

## Verification (headless on the dev box)

Run in order; each gates the next:

1. `pnpm install` -- clean install, confirm `patch-package` postinstall applies
   all three patches.
2. `npx expo install --check` (the `fix-deps` script) -- should report all deps
   on their SDK 54 target versions.
3. `npx expo-doctor` -- resolve/triage findings; the existing
   `reactNativeDirectoryCheck` excludes and autolinking excludes in
   `package.json` should carry over (minus `react-native-securerandom` if step 6
   is done). Expect and accept warnings about the known-unmaintained excluded
   packages.
4. `npm run compile` (`tsc --noEmit`) -- type-check against React 19.1 /
   RN 0.81 types.
5. `npm run test-jest` -- RN/component tests under `jest-expo` 54.
6. `npm run test-node` -- protocol tests.
7. `npx expo export --platform ios --platform android` -- the strongest headless
   signal that the bundle builds; exercises the `import.meta` / Hermes and
   `@noble/hashes` shims. Confirm no bundling/transform errors.

**Deferred to the user (not possible on the Linux box):**

- `npm run prebuild:ios` / `npm run prebuild:android` then native builds.
- Device/simulator smoke test, focusing on: QR scanning (vision-camera),
  biometric unlock (keychain + random seed/salt), file import/share (fs +
  document-picker + share), PDF export (html-to-pdf), and **Android
  edge-to-edge layout** (forced on in SDK 54).
- Maestro UI test: `npm run test:ui`.

## Out of scope (future SDK 55 effort)

Migrating to the New Architecture and replacing the remaining unmaintained
native modules: `react-native-fs` (to `@dr.pogodin/react-native-fs` or
`expo-file-system`), `react-native-html-to-pdf` (to `expo-print`),
`react-native-exit-app`, `react-native-keyboard-aware-scroll-view`,
`react-native-document-picker` (to `@react-native-documents/picker`). None of
these are touched in this upgrade. (`react-native-securerandom` is handled early
in step 6.)
