# T3 Digital Credential Wallet Changelog

## Unreleased - TBD

### Changed

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

## 1.0.0

### Initialize

- Forked from LCW v2.2.9 - build 103
