# Enable the New Architecture (SDK 54 / RN 0.81)

> Status: config flipped, verification pending. Follow-on to
> [`expo54-rn81-migration-plan.md`](expo54-rn81-migration-plan.md).

## Context

The SDK 54 / RN 0.81 / React 19.1 upgrade is complete and the app ran on the
**legacy** architecture (`newArchEnabled: false`). This step turns the New
Architecture on. SDK 54 is the last SDK that supports legacy; SDK 55+ is
New-Arch-only, so this is the unavoidable next move.

**What changed:** `app.config.js` -- a top-level `expo.newArchEnabled: true`. (SDK
54 defaults New Arch on; the explicit `true` is documentation, not strictly
required.) The deprecated per-platform `ios.newArchEnabled` /
`android.newArchEnabled` keys under the `expo-build-properties` plugin were
removed -- `expo-build-properties` now warns on them and points to this
top-level field.

**Why there are no expected hard blockers:** every unmaintained native module
the migration plan flagged as a New-Arch obstacle has already been replaced
(`react-native-fs` to `expo-file-system`, `react-native-html-to-pdf` to
`expo-print`, `react-native-exit-app` to `expo-updates`,
`react-native-securerandom` to `react-native-get-random-values`,
`react-native-document-picker` to `@react-native-documents/picker`,
`react-native-keyboard-aware-scroll-view` removed). No app code touches the
legacy bridge (`NativeModules`, `requireNativeComponent`, `UIManager`).

> The Linux dev box cannot build or launch the RN app. Steps 1-2 below are
> headless and can run here; everything from step 3 on is on a macOS / Android
> build host with a device or simulator.

## Native module risk map

What to watch, by how each module participates in the New Architecture.

### Native New-Arch (codegen / TurboModule / Fabric) -- expected clean

`react-native-keychain` v10, `react-native-vision-camera` 4.7,
`react-native-worklets-core`, `react-native-share`,
`@react-native-clipboard/clipboard`, `@react-native-documents/picker`,
`react-native-get-random-values` v2, plus all `expo-*`,
`react-native-screens`, `react-native-safe-area-context`,
`react-native-gesture-handler`, `react-native-svg`. These ship codegen configs
and run natively on New Arch.

> `react-native-get-random-values` was bumped from `1.11` to **`2.0.0`**, which
> is a TurboModule rewrite (codegen spec, `TurboModuleRegistry.getEnforcing`,
> `react-native >=0.81` peer). It moved out of the interop-layer bucket below --
> it now runs as a first-class New-Arch module rather than through the
> backward-compat layer. The polyfill's public surface
> (`crypto.getRandomValues`) is unchanged; the major bump only drops legacy-arch
> / pre-0.81 support. Note this also removes the legacy-arch escape hatch *for
> this module*: under `newArchEnabled: false` its `getEnforcing` lookup would
> throw, so it can no longer be smoke-tested on the legacy path.

### Legacy modules via the RN 0.81 interop layer -- smoke-test these

These have native code but the **old** module interface (no TurboModule). RN
0.81's backward-compat interop layer runs them, so they should work, but they
are the most likely place for a New-Arch surprise:

- `react-native-device-info` 10.14 -- newer majors are full TurboModule if this
  one misbehaves under New Arch.
- `react-native-file-logger` 0.4.1.

> `react-native-get-random-values` used to head this list as the
> **highest-priority** interop-layer risk -- it backs the PBKDF2 salt
> (`app/model/DatabaseAccess.ts`) and the DID seed (`app/model/profile.ts`),
> where a silent failure corrupts key material. The `2.0.0` TurboModule bump
> moved it up to the native New-Arch section, so it no longer rides the interop
> layer. The device smoke test below still exercises it (key material is
> security-critical regardless of how the module loads).

### Pure-JS, architecture-agnostic -- not arch blockers, but aging

`react-native-paper` **v4** and `react-native-elements` 3.4 are both
unmaintained and several majors behind. They cannot block the New-Arch *build*,
but they are the likeliest React-19 / new-renderer runtime risk. Watch for
rendering glitches that are easy to misattribute to the architecture flip.

## Verification

Run in order; each gates the next.

### Headless (can run on the dev box)

1. `pnpm install` -- clean install.
2. `npm run compile` (`tsc --noEmit`) -- type-check is unaffected by the arch
   flip, but confirms nothing else drifted.

> `expo export` exercises the JS bundle but **not** the native New-Arch build,
> so it does not validate this change. The real signal is a native build.

### Native build (macOS / Android host)

3. `npm run prebuild:ios` and `npm run prebuild:android` -- regenerate native
   projects with New Arch on. Confirm prebuild completes with no autolinking or
   codegen errors.
4. Native build each platform (`npm run ios` / `npm run android`, or via the
   build host). **A successful compile + link is the first real New-Arch
   signal** -- codegen and the interop layer are exercised here.

### Device / simulator smoke test

Focus on the modules above and on the SDK 54 edge-to-edge change:

- [ ] **App launches** past splash without a redbox.
- [ ] **Unlock / key material** -- create or unlock a wallet; create a new
      profile. Exercises `react-native-get-random-values` (salt + DID seed) and
      `react-native-keychain`. A failure here is the worst case -- verify a
      credential still verifies after a fresh profile.
- [ ] **QR scan** -- `react-native-vision-camera` + `react-native-worklets-core`
      (both Fabric-native; confirm the camera preview renders under Fabric).
- [ ] **File import / share** -- `@react-native-documents/picker`,
      `expo-file-system`, `react-native-share`.
- [ ] **PDF export** -- `expo-print`.
- [ ] **Clipboard** copy/paste -- `@react-native-clipboard/clipboard`.
- [ ] **Android edge-to-edge** -- forced on since SDK 54; check
      `SafeScreenView` insets on screens that draw near the status / nav bars.
- [ ] **UI rendering** -- spot-check `react-native-paper` v4 and
      `react-native-elements` components (buttons, inputs, dialogs, the bottom
      tabs) for layout / touch glitches under the new renderer.
- [ ] **Logs** -- `react-native-file-logger` still writes; check for interop
      bridge warnings in the native console.

### UI flow

5. `npm run test:ui` (Maestro) -- note these flows are stale for this fork (see
   CLAUDE.md); re-point before relying on them.

## If something breaks

- **A native module fails to build under New Arch:** check for a newer major
  with TurboModule support (most likely `react-native-device-info`).
- **A module loads but throws at runtime:** it is probably going through the
  interop layer; confirm the package is current and check its New-Arch notes.
- **Rendering-only glitches:** suspect `react-native-paper` v4 /
  `react-native-elements` 3.4 (React 19 renderer) before suspecting the arch.
- **Can't isolate it:** set the top-level `expo.newArchEnabled` back to `false`
  to confirm the regression is arch-specific, then narrow down. (Legacy is only
  an option on SDK 54 -- it disappears at SDK 55.)
