# T3 Digital Credential Wallet Changelog

## Unreleased - TBD

### Changed

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
