# T3 Digital Credential Wallet Changelog

## Unreleased - TBD

### Changed

- Replaced `react-native-device-info` with `expo-application`. The library was
  only used to read the app's own version, build number, and bundle id (on the
  **About** screen and in the exported debug log); all three are available from
  `expo-application` (`nativeApplicationVersion`, `nativeBuildVersion`,
  `applicationId`), which is part of the Expo SDK and needs no extra native
  config. Removes another unmaintained third-party native dependency.
- Removed the unmaintained `react-native-base64` dependency. Its only use was
  `base64.decode()` in `lib/import.ts`, replaced with the already-imported
  `Buffer.from(str, 'base64')` (the same file already used `Buffer` elsewhere).
- Replaced the abandoned `rn-animated-ellipsis` package (last published 2022)
  with a small in-repo `AnimatedEllipsis` component built on React Native's
  `Animated` API. It is a drop-in replacement (same `style` / `minOpacity` /
  `animationDelay` props) used by `LoadingIndicatorDots` and
  `CredentialRequestHandler`.
- Bumped `react-native-get-random-values` from `^1.8.0` (`1.11`) to `^2.0.0`.
  `2.0.0` is a TurboModule rewrite (codegen spec,
  `TurboModuleRegistry.getEnforcing`, `react-native >=0.81` peer), so the
  polyfill now runs as a first-class **New Architecture** module instead of
  through RN 0.81's backward-compat interop layer. This was the
  highest-priority interop-layer risk in
  `docs/new-architecture-verification.md` (it backs the PBKDF2 salt and DID
  seed). The public `crypto.getRandomValues` surface is unchanged; the major
  bump only drops legacy-arch / pre-0.81 support.

## 3.1.0 - 2026-06-07

### Fixed

- The developer "Clear verification cache" button now actually clears the
  verification cache. It previously called
  `Cache.removeAll(CacheKey.VerificationResult)` against the AsyncStorage cache,
  but verification results are memoized in an in-memory `LruCache`
  (`verifiableObject.ts`) and were never written under that key -- so the button
  was a no-op. It now calls a new `clearVerificationCache()` that clears the
  `LruCache`. The orphaned `CacheKey.VerificationResult` enum member was removed.
- Adding a credential (and other "select a profile" flows, including incoming
  credential-request deep links) no longer redirects to a blank, dead-end
  **Choose Profile** screen. `NavigationUtil.selectProfile` and the deep-link
  `request` handler now default to the first profile whenever any profile
  exists, instead of only when exactly one exists. This is gated behind the new
  `FEATURE_FLAGS.supportMultipleProfiles` flag (default `false`): when `false`
  the wallet always uses the default profile and never prompts; set it to `true`
  to restore the original LCW multiple-profile selection behavior.

### Changed

- Enabled the **New Architecture** via the top-level `newArchEnabled: true` in
  `app.config.js` (the per-platform `ios.newArchEnabled` /
  `android.newArchEnabled` keys under `expo-build-properties` are deprecated and
  were removed). This was unblocked by the preceding work to replace the
  unmaintained native modules that lacked New-Arch support (`react-native-fs`,
  `react-native-html-to-pdf`, `react-native-exit-app`,
  `react-native-securerandom`, `react-native-document-picker`,
  `react-native-keyboard-aware-scroll-view`). Remaining legacy native modules
  (`react-native-get-random-values`, `react-native-device-info`,
  `react-native-file-logger`) run via RN 0.81's interop layer. See
  `docs/new-architecture-verification.md` for the device verification checklist.
- Migrated to **Expo SDK 54** (React Native 0.81, React 19.1). The migration
  initially stayed on the **legacy RN architecture** (`newArchEnabled: false`)
  before the New-Architecture flip above. SDK 54 is the last SDK that supports
  the legacy architecture. `expo install --fix` drove the version bumps for `expo-*` and
  Expo-managed RN packages; pnpm React / `@types/react` overrides moved to the
  19.1 line.
- Raised native build floors in `app.config.js` (expo-build-properties): Android
  `compileSdkVersion` / `targetSdkVersion` to 36 and `buildToolsVersion` to
  `36.0.0`; iOS `deploymentTarget` to `15.1`.
- Replaced the unmaintained `react-native-securerandom` at the wallet's own call
  sites (PBKDF2 salt in `DatabaseAccess`, DID seed in `profile`) with the
  `react-native-get-random-values` polyfill (`crypto.getRandomValues`), removing
  it as a direct dependency. It remains present transitively via
  `@digitalcredentials/bnid`.
- Replaced the deprecated `react-native-document-picker` with its maintained
  successor `@react-native-documents/picker` in `pickAndReadFile`
  (`app/lib/import.ts`). `pickSingle({ copyTo })` becomes `pick()` plus an
  explicit `keepLocalCopy()` to obtain the cached local copy on iOS. (The
  Android `content://` copy path was subsequently removed -- see the
  `expo-file-system` migration below.)
- Replaced the unmaintained `react-native-fs` with Expo's `expo-file-system`
  (the new `File` / `Paths` API) across `app/lib/import.ts`,
  `app/lib/shareData.ts`, `app/model/DatabaseAccess.ts`, and `DeveloperScreen`,
  removing it as a direct dependency. On Android, `pickAndReadFile` now reads the
  picked `content://` URI directly (via SAF) instead of first copying it to a
  temporary file -- the copy existed only because `react-native-fs` could not
  read `content://`. The PBKDF2 salt is now hex-encoded at generation
  (`bytesToHex` of 64 random bytes) instead of being UTF-8-decoded from raw
  bytes, which silently discarded entropy (invalid UTF-8 sequences collapse to
  `U+FFFD`); existing wallets are unaffected because the salt file is still read
  back verbatim.
- Replaced the unmaintained `react-native-html-to-pdf` with Expo's `expo-print`
  in the "Export as PDF" pipeline (`app/lib/svgToPdf.ts`), removing it as a
  direct dependency. `RNHTMLtoPDF.convert({ html, fileName })` becomes
  `Print.printToFileAsync({ html })`. Since `expo-print` has no `fileName` option
  (it writes a random name to the cache directory), the rendered PDF is renamed
  via `expo-file-system` to `"<credential name> Credential.pdf"` so the share
  sheet still shows a meaningful name; a nameless credential falls back to
  `"Credential Credential.pdf"` (previously the literal `"undefined Credential"`).
  The `PDF` type's `filePath` field became `uri` (a `file://` URI), so
  `usePublicLink` now shares it directly instead of prefixing `file://`. The
  JS-side template logic was split into pure, unit-tested helpers
  (`buildCredentialHtml`, `pdfFileNameFor`); the native HTML-to-PDF rendering
  itself runs in `expo-print` and remains a device/manual QA concern.
- Replaced the unmaintained `react-native-exit-app` with `expo-updates` in
  `RestartScreen` (shown after a wallet reset), removing it as a direct
  dependency. The screen no longer asks the user to manually quit and reopen
  (`RNExitApp.exitApp()`, which on iOS relied on an `exit(0)` call that Apple's
  review guidelines reject); the "Restart Now" button now calls
  `Updates.reloadAsync()` to reload the JS bundle and reinitialize the wallet to
  onboarding. If the reload rejects (e.g. in development builds), the screen
  falls back to the manual "close and re-open" instructions.
- Replaced the unmaintained `react-native-keyboard-aware-scroll-view` with React
  Native's built-in `KeyboardAvoidingView` + `ScrollView` in `SafeScreenView`
  (the universal screen wrapper), removing it as a direct dependency without
  adding a new native module. Keyboard avoidance is now `behavior="padding"` on
  iOS and OS window resize on Android; `keyboardShouldPersistTaps="handled"`
  preserves tap-through behavior. Only `SafeScreenView`'s input-bearing
  consumers (`LoginScreen`, onboarding in `SetupNavigation`) are affected, and
  both use simple single-field passphrase forms. With this, the
  `reactNativeDirectoryCheck.exclude` list is now empty.
- Replaced the unmaintained `react-native-storage` (last released 2022) with a
  direct `AsyncStorage` implementation in `app/lib/cache.ts`, removing it as a
  direct dependency without adding a new one (`AsyncStorage` was already used).
  The `Cache` class keeps the same public API (`load`/`store`/`remove`/
  `removeAll`/`clear`, including the optional `expires` duration). Entries are
  namespaced under a `@dcw-cache:` prefix so `clear()`/`removeAll()` only touch
  cache keys and leave the app's other AsyncStorage data intact. The on-disk key
  format changes, so the existing public-links / verification cache is dropped
  once on upgrade (it is a cache and re-populates on next use).
- Upgraded `react-native-keychain` from `^8.1.1` to `^10.0.0` and removed the
  `patches/react-native-keychain+8.2.0.patch` patch-package patch: it injected
  `compileOptions { sourceCompatibility/targetCompatibility = 1.8 }` into the
  Android `build.gradle`, which upstream now ships natively (Java 17). Two
  `biometrics.ts` option fields were dropped to match v10's typed option shapes:
  `authenticationType` is no longer a `setGenericPassword` option (biometric
  gating on the stored key is driven by `storage: RSA` +
  `accessControl: BIOMETRY_ANY`), and `storage` is no longer a
  `getGenericPassword` option (retrieval auto-detects the storage type used when
  the item was written). Also dropped the
  `declare module 'react-native-keychain'` ambient shim from `declarations.d.ts`
  now that the package ships its own TypeScript types.
- Removed the `patches/react-native-paper+4.12.8.patch` patch-package patch by
  replacing the multiline "Paste JSON or URL" field in `AddScreen.tsx` with a
  plain React Native `TextInput`. The patch only fixed paper v4's outlined
  multiline label/padding math, which AddScreen never relied on (it renders its
  own label above the box); the bordered look is now reproduced with a simple
  border style. The other four single-line paper `TextInput`s are unaffected and
  remain on paper v4. `patches/` is now empty.

### Fixed

- `CredentialItem` type error under React Native 0.81: narrowed the
  accessibility props object from `ComponentProps<typeof View>` to
  `AccessibilityProps`, since RN 0.81 widened `View`'s `onBlur` to allow `null`,
  which is incompatible with `TouchableOpacity` when spread.
- Android `:react-native-vision-camera:compileDebugKotlin` failure under RN 0.81
  by bumping `react-native-vision-camera` 4.7.1 to 4.7.3 (the last 4.x release).
  4.7.1's `CameraViewManager`/`CameraViewModule` used the pre-0.81 Kotlin APIs
  (`getExportedCustomDirectEventTypeConstants(): MutableMap<...>` and direct
  `currentActivity`); 4.7.3 uses the 0.81-compatible `Map<...>` return type and
  `reactApplicationContext.currentActivity`. Stayed on 4.x: vision-camera 5.x is
  a Nitro-modules rewrite requiring the New Architecture (out of scope here).

> **Note:** Android edge-to-edge is forced on in SDK 54 and cannot be disabled --
> verify `SafeScreenView` insets on device.

## 3.0.0 - 2026-06-07

### Security

- Removed crypto shims (`crypto-polyfill.js` and the stub
  `randomBytes`/`createHash`/`pbkdf2Sync` in `shim.js`, plus the `crypto` build
  aliases). App code now uses `@noble/hashes`: PBKDF2-HMAC-SHA512 derives the
  database encryption key (previously a non-cryptographic toy loop) and SHA-256
  hashes credential content. The `@interop/*` packages resolve their own
  `react-native` exports (backed by `@noble/*`) without the alias. Only the
  load-bearing polyfills remain in `shim.js`: `global.Buffer`, `btoa`, and a real
  `expo-crypto`-backed `crypto.subtle.digest` (used by `rdf-canonize` during
  rdfc-2022 canonicalization).
  - **Breaking:** real PBKDF2 changes the derived encryption key, so wallets
    created with the old fake KDF can no longer be decrypted. Existing installs
    must be reset/re-initialized.

### Fixed

- `expo export` / iOS (Hermes) builds failing on `import.meta is not supported in
Hermes` from `@digitalbazaar/credentials-context`, by enabling
  `unstable_transformImportMeta` in babel-preset-expo (`babel.config.js`).
- `DatabaseAccess.reset()` now clears the persisted key material
  (`privileged_key_status` / `privileged_key` in SecureStore) and the PBKDF2 salt
  file, and tolerates already-missing files. Previously these survived a reset
  (the iOS Keychain persists across reinstalls), leaving a stale `unlocked`
  status that made the next wallet initialization fail with "Cannot initialize
  unlocked wallet."

### Changed

- Replaced Realm with `expo-sqlite` + SQLCipher for the encrypted wallet
  database. The `realm` and `bson` dependencies are removed; the model layer
  (`app/model/`) now opens a single SQLite connection keyed with the raw 32-byte
  hex key via `PRAGMA key`, with the schema defined and versioned (`PRAGMA
user_version`) in `app/model/schema.ts`. Record ids are now plain `string`
  UUIDs throughout the app (generated with `react-native-uuid`), replacing
  `Realm.BSON.ObjectId` / `bson` `ObjectID` and their `.equals()` /
  `.toHexString()` call sites. Requires a native rebuild (`expo prebuild`).
  - **Breaking:** there is no Realm→SQLite data migration. Updating users get a
    fresh, empty database and must recover via an exported JSON backup or WAS.
- Wallet and profile backups now export as a content-addressed **tar archive**
  (`Wallet Backup.tar` / `Profile Backup.tar`) instead of a single JSON file.
  Credentials are written once under `credentials/<cid>.json` (CID = JCS-
  canonicalized SHA-256, base64url) and **deduplicated across profiles**; each
  profile in `profiles/<slug>.json` references its credentials by CID, so
  per-profile credential membership is preserved across export/import. Profile
  filenames are uniquified (`work`, `work-2`, ...) when distinct profile names
  slugify identically, so no profile is lost to a filename collision. New
  modules `app/lib/walletBackupCore.ts` (model-free pack/extract/round-trip) and
  `app/lib/cid.ts`; `app/lib/walletBackup.ts` is now a thin Realm shell over the
  core. (`app/lib/export.ts`)
- Backup import auto-detects format: new `.tar` archives and legacy `.json`
  exports both restore. Tar detection uses the `.tar` extension or the `ustar`
  magic bytes; `RestoreWalletScreen` and `AddExistingProfileScreen` copy now
  mentions `.tar or .json`. (`app/lib/import.ts`)
- Jest no longer runs with `--experimental-vm-modules`, and `@noble/hashes`
  (ESM-only) is added to `transformIgnorePatterns` so it transpiles to CJS. This
  lets the CID/backup code be imported under Jest. (`jest.config.ts`,
  `package.json`)
- Trimmed dead polyfills now that the app targets modern Hermes: removed the
  `BigInt` polyfill (native since RN 0.70+) and its `big-integer` dependency, the
  unused `base64FromArrayBuffer` shim, and the `text-encoding` dependency
  (`DatabaseAccess` now uses the global `TextEncoder`/`TextDecoder`).
- Switched the verifier from `@digitalcredentials/verifier-core` to the
  `@interop/verifier-core` fork and upgraded
  `@digitalcredentials/issuer-registry-client` `^3.0.0` to `^4.0.0` (a breaking
  API redesign). `app/lib/validate.ts` is now a thin adapter that runs the
  fork's composable suite pipeline plus two custom suites (`expirationSuite`,
  `issuerDetailsSuite` -- re-adding the expiration check and rich issuer
  metadata the fork no longer bundles) and translates the result back into the
  legacy `log[]` shape, so the view layer (`VerificationStatusCard`,
  `IssuerInfoScreen`, `issuer.ts`, status badges) is unchanged. Issuer/requester
  DID lookups now go through a new cached `RegistryManager`
  (`app/lib/registry/`) -- a single warm, offline-capable cache (in-memory +
  AsyncStorage) shared by the verify pipeline and the standalone "who's asking"
  lookup -- replacing the eager-loaded `DidRegistryContext`. `shouldDisableUrls`
  is now purely verification-driven (and stays synchronous); `ShareHomeScreen`
  resolves the requester name via the registry manager.

- Removed the legacy split `.d.ts`/`.d.tsx` declaration files that shadowed their
  `.tsx`/`.ts` siblings (tech-debt item 3). Component and screen prop/helper types
  are now inlined into their implementation files; the 8 cycle-sensitive screen
  modules that define route `*ScreenParams` consumed by navigation were moved to
  sibling `.types.ts` files instead (inlining them would create a
  screen-to-navigation import cycle). 15 shadow files were deleted and 8 renamed.
- Consolidated credential typing on `IVerifiableCredential` from
  `@interop/data-integrity-core`: replaced the removed `Credential` type in
  `CredentialItem` and `VerificationStatusCard` and in the
  `CredentialDisplayConfig.itemPropsResolver` signature.
- `mintDid()` now uses the `@interop/did-method-key` and
  `@interop/ed25519-verification-key` forks (via the
  `driver().use({ keyPairClass })` + `generate({ seed })` pattern), replacing
  `@digitalcredentials/did-method-key` and
  `@digitalcredentials/ed25519-verification-key-2020` in `app/lib/did.ts`.
- Migrated the remaining `@digitalcredentials/*` credential dependencies to the
  `@interop/*` forks: `@digitalcredentials/vc` to `@interop/vc`,
  `@digitalcredentials/ed25519-signature-2020` to `@interop/ed25519-signature`,
  `@digitalcredentials/security-document-loader` to
  `@interop/security-document-loader`, and `@digitalcredentials/lru-memoize` to
  `@interop/lru-memoize` (`@digitalcredentials/issuer-registry-client` is
  intentionally retained). The `Ed25519Signature2020` suite now takes a `signer`
  (via `Ed25519VerificationKey.signer()`) instead of a `key`, and the `LruCache`
  in `verifiableObject.ts` uses `ttl` instead of the dropped `maxAge`. Both
  suites' module declarations were removed from `declarations.d.ts` since the
  forks ship their own types.
- Presentation signing now negotiates the proof cryptosuite per the VCALM
  `acceptedCryptosuites` query field (on `DIDAuthentication` and
  `QueryByExample`). The wallet still signs with `Ed25519Signature2020` (VC 1.0
  context) by default for backwards compatibility, but when a verifier requests
  `eddsa-rdfc-2022` it signs a `DataIntegrityProof` under the VC 2.0 context. As
  a fallback when no `acceptedCryptosuites` is given, a QueryByExample asking for
  a VC 2.0 example credential also triggers the `eddsa-rdfc-2022`/VC 2.0
  response. New `app/lib/presentationSuite.ts` (`negotiateCryptosuite`,
  `presentationSuiteFor`) centralizes the choice of suite and VC data model
  version, consumed by `composeVp.ts`, `present.ts`, and `exchanges.ts`. Added
  `@interop/data-integrity-proof` as a direct dependency for the
  `eddsa-rdfc-2022` path.

### Removed

- Dropped support for VPQR-encoded credentials and removed the
  `@digitalcredentials/vpqr` dependency (along with the `credentialsFromVpqr.ts`
  helper and its `declarations.d.ts` entry). `credentialsFrom()` still detects
  the `VP1-` prefix but now throws a `HumanReadableError`
  ("VPQR encoded credentials are not supported.") that surfaces to the user when
  scanning a VPQR QR code or pasting VPQR text into the Add Credential screen.
- Dropped the unused `keyAgreementKey` (X25519) from DID minting and throughout
  the model layer: `AddDidRecordParams`, the `DidRecord` schema, profile
  import/export, wallet parsing, and the debug screen. The
  `@digitalcredentials/x25519-key-agreement-key-2020` dependency is no longer
  used by `mintDid()`.
- Bumped the Realm schema version (added a no-op migration) to drop the now-unused
  `rawKeyAgreementKey` column. Existing wallets migrate automatically on next open.

### Fixed

- Repaired broken type imports surfaced by the type consolidation: `CredentialRecordRaw`
  is now imported from the `../../model` barrel (the `model/credential` module does not
  re-export it), `WalletApiMessage` from `lib/walletRequestApi` (replacing the
  nonexistent `lib/vcApi`), and a dead `VcApiCredentialRequest` import was removed.
- `evidenceFromCredential()` and the credential display cards now accept
  `IVerifiableCredential`: relaxed the `VCWithEvidence` helper type and narrowed the
  `credentialSubject` union via `getSubject()` in the Student ID card.
- `AddScreen` now guards against an undefined parsed Wallet API message before
  navigating to the exchange flow.

## 2.2.9

### Initialize

- Forked from LCW v2.2.9 - build 103
