# T3 Digital Credential Wallet Changelog

## Unreleased - TBD

### Fixed

- Adding a credential (and other "select a profile" flows, including incoming
  credential-request deep links) no longer redirects to a blank, dead-end
  **Choose Profile** screen. `NavigationUtil.selectProfile` and the deep-link
  `request` handler now default to the first profile whenever any profile
  exists, instead of only when exactly one exists. This is gated behind the new
  `FEATURE_FLAGS.supportMultipleProfiles` flag (default `false`): when `false`
  the wallet always uses the default profile and never prompts; set it to `true`
  to restore the original LCW multiple-profile selection behavior.

### Changed

- Migrated to **Expo SDK 54** (React Native 0.81, React 19.1), staying on the
  **legacy RN architecture** (`newArchEnabled: false`). SDK 54 is the last SDK
  that supports the legacy architecture; moving to the New Architecture and
  replacing the remaining unmaintained native modules is a separate future SDK 55
  effort. `expo install --fix` drove the version bumps for `expo-*` and
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
  explicit `keepLocalCopy()` to obtain the cached local copy on iOS; the Android
  `content://` copy path is unchanged.
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
