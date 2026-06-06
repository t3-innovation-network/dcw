# T3 Digital Credential Wallet Changelog

## Unreleased - TBD

### Changed

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

## 1.0.0

### Initialize

- Forked from LCW v2.2.9 - build 103
