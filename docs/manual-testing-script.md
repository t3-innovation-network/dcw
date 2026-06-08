# Manual Testing Script

Step-by-step scripts for exercising wallet features by hand on a real device or
simulator. These cover flows that the automated Jest / `test-node` suites cannot
fully verify -- anything that depends on native modules, the OS file system, or
real user interaction.

> Run these on an actual build (`expo run:ios` / `expo run:android` or a dev
> client). The picker, file system, and secure storage are native modules and do
> not exist in the Jest environment.

## What is already automated (don't re-test by hand)

A lot of the *logic* behind these flows is already covered by Jest, with the
native modules mocked. The manual steps below exist only to exercise the real
native module, OS UI, and on-device build -- the parts a mock cannot stand in
for. Before walking a section, check what is already proven:

- **`test/import.test.ts`** -- `readFile` type-routing (PNG-embedded JSON vs
  plain JSON), `pickAndReadFile` copy logic for all three platform paths
  (Android `content://`, Android `file://`, iOS `keepLocalCopy`), and
  `importProfileFrom` / `importWalletFrom` / `importWalletOrProfileFrom` /
  report aggregation. The picker itself (`pick()`) is mocked.
- **`test/biometrics.test.ts`** -- the `setGenericPassword` / `getGenericPassword`
  argument shapes, the error mapping (disabled / invalid / canceled),
  `getSupportedBiometryType`, and the `face-recognition` vs `fingerprint` icon
  selection. The keychain module is mocked.

### Maestro UI flows

The `.maestro/` flows can drive the add-credential (JSON/URL paste), verification,
issuer-info, profile-management, and password lock/unlock screens. Caveats:

- **Linux/CI runs Android only.** The Maestro CLI is JVM + ADB and runs on Linux
  against an Android emulator/device. iOS flows need a macOS host (Xcode
  simulator). This dev machine cannot build/launch the RN app at all, so Maestro
  is a CI / Mac-or-Android-box concern, not runnable here.
- **The current flows are stale for this fork** and need re-pointing before they
  pass: `config.yaml` uses the iOS appId `edu.mit.eduwallet` (this fork is
  `org.t3.lcw`); onboarding taps **"Quick Setup"** (this fork's button is
  **"Create Your Wallet"**); and `lock-unlock-wallet.yaml` relies on the **Sign
  out** button, which only exists when `passwordProtect: true` (this fork
  defaults to `false`). Android `package: app.lcw` does match.

Everything that remains genuinely needs a human on a device: the real picker and
provider-backed files, the real OS biometric prompt, the `passwordProtect: false`
lockout/recovery path, and a clean on-device (Android Java-17) release build.

## Testing the Document Picker

The wallet reads files through the OS document picker
(`@react-native-documents/picker`) in `app/lib/import.ts` (`pickAndReadFile`).
There are three places in the UI that open it, and the platform-specific copy
logic differs, so test on **both iOS and Android**.

### What is being exercised

The copy logic and type-routing are already unit-tested in
`test/import.test.ts` (with `pick()` mocked). What a human run adds on top is the
**real native picker** and **real provider-backed files** -- the one thing the
mock cannot reproduce:

- `pick()` opens the native picker and returns a real file URI (the mock just
  returns a fixed object).
- On **iOS**, `keepLocalCopy({ destination: 'cachesDirectory' })` must
  successfully stage a readable copy of a *provider-backed* file (iCloud Drive),
  not just an `On My iPhone` local file.
- On **Android**, a real `content://` URI (e.g. from Google Drive) must copy into
  the temp directory; a `file://` URI is read directly.

Confirm the picked file lands in the foyer end-to-end; the per-type parsing is
already proven by the unit test.

### Entry point 1: Add a credential from a file (primary)

1. Launch the app and unlock the wallet.
2. Tap the **Add** tab in the bottom navigation.
3. Tap **Add from file** (the button with the upload icon).
4. The native file picker should open.
5. Choose a credential file (see "Test files" below).
6. Expected: the picker closes and the credential lands in the **credential
   foyer** for approval (the Approve Credentials screen). Approve it and confirm
   it appears in **My Wallet**.

### Entry point 2: Restore a wallet from a backup file

1. From onboarding (or the restore flow), open the **Restore** screen.
2. Tap **Choose a file**.
3. In the picker, select a wallet backup -- a `.json` export or a `.tar`
   backup file.
4. If the backup is password-protected, the modal prompts for the passphrase.
5. Expected: a **Restore Complete** dialog with a **Details** link summarizing
   how many profiles / credentials were imported, skipped, or failed.

### Entry point 3: Add an existing profile from a file

> Only reachable when `FEATURE_FLAGS.supportMultipleProfiles` is enabled.

1. Go to **Settings > Manage Profiles > Add Existing Profile**.
2. Tap **Restore from a file**.
3. Select a single-profile export `.json` file.
4. Expected: an **Existing Profile Details** report, and the profile appears in
   the Manage Profiles list.

### Test files to cover

The type-routing in `readFile` is unit-covered, so you don't need to run all of
these by hand -- pick **one or two** (e.g. the OpenBadge PNG and a `.tar`
backup) just to confirm the native picker delivers bytes the parser accepts
end-to-end. The full matrix is listed for reference:

| File                         | Purpose                                                              |
| ---------------------------- | ------------------------------------------------------------------- |
| Single VC, `*.json`          | Plain JSON credential import                                        |
| Verifiable Presentation JSON | VP wrapping one or more VCs                                          |
| Profile export `*.json`      | Single-profile import (User ID + credentials)                       |
| Wallet array `*.json`        | Top-level JSON array of profiles                                    |
| OpenBadge PNG `*.png`        | Credential embedded in PNG metadata (`openbadgecredential` keyword) |
| Wallet backup `*.tar`        | tar archive (also detected by the `ustar` magic bytes)              |

### Platform-specific checks

- **iOS**: pick a file from **iCloud Drive** and from **On My iPhone**. Both must
  succeed -- this confirms the `keepLocalCopy` staging works for provider-backed
  files, not just local ones. Pick a file whose name contains spaces or
  parentheses (e.g. `badge file (1).json`) to confirm URI decoding.
- **Android**: pick a file from **Downloads** and from **Google Drive** (a
  `content://` provider). The Drive case confirms the `content://` to
  temp-directory copy path. Again, use a filename with spaces/parentheses to
  confirm the filename is sanitized.

### Error / edge cases

1. **Cancel the picker** (back out without choosing a file). Expected: nothing
   happens -- no error dialog. The cancel is swallowed (`CANCEL_PICKER_MESSAGES`).
2. **Pick an unsupported / malformed file** (e.g. a random `.txt` or a corrupt
   `.json`). Expected: an **Unable to Add Credentials** dialog (entry point 1)
   advising that the file must contain credentials and be a supported type.
3. **Pick an empty file.** Expected: handled gracefully with the same error
   dialog, no crash.

## Testing react-native-keychain / wallet unlock behavior

The wallet's unlock and biometrics flows are the only consumers of
`react-native-keychain` (via `app/lib/biometrics.ts`). The `biometrics.ts` logic
-- argument shapes, error mapping, icon selection -- is already covered by
`test/biometrics.test.ts` with the keychain mocked. What that **cannot** prove is
the real native keychain (RSA-keystore set/get/reset), the real **OS biometric
prompt**, and that the v10 native module builds and runs on device. Those are the
point of this section and the primary smoke test after the
`react-native-keychain` 8 to 10 upgrade -- run it on a **real device or simulator
with biometrics enrolled** (Face ID / Touch ID on iOS, fingerprint / face unlock
on Android).

### What is being exercised

- `storeInBiometricKeychain` -- `Keychain.setGenericPassword` with
  `storage: RSA` + `accessControl: BIOMETRY_ANY`. Called by
  `DatabaseAccess.enableBiometrics`; writes the 32-byte hex DB key into the
  keychain so it can later be released only after a biometric check.
- `retrieveFromBiometricKeychain` -- `Keychain.getGenericPassword` with
  `accessControl: BIOMETRY_ANY` + an `authenticationPrompt`. Called by
  `unlockWithBiometrics`; triggers the **OS biometric prompt** and returns the
  stored key.
- `resetBiometricKeychain` -- `Keychain.resetGenericPassword`. Called by
  `disableBiometrics` and `reset`; clears the stored key.
- `getSupportedBiometryType` -- decides whether biometrics UI appears at all and
  which icon (`face-recognition` vs `fingerprint`) is shown.

Two flags drive the surrounding behavior, set in `app.config.js`
`FEATURE_FLAGS`:

| Flag                          | `true`                                                  | `false` (this fork's default)                              |
| ----------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| `passwordProtect`             | Original LCW: password set at setup, `LoginScreen` gates relaunch, **Sign out** shown in Settings | No password screen; setup uses a random passphrase, wallet stays unlocked, no **Sign out** in Settings |
| (biometrics enabled/disabled) | Per-user toggle, independent of `passwordProtect`       | Same toggle still available in Settings                    |

> To switch flags you must edit `FEATURE_FLAGS` in `app.config.js` and do a full
> rebuild (it is read at build time, not runtime). Because the on-device wallet
> state persists, **reset the wallet (Settings to Reset wallet) or reinstall
> between flag changes** so you start from a clean setup flow.

### Scenario A: `passwordProtect: false` (this fork's default)

Setup:

1. Fresh install. On the start screen tap **Create Your Wallet**.
2. Expected: **no** password step and **no** biometric prompt -- `_quickSetup`
   generates a random UUID passphrase and lands you directly in **My Wallet**.
3. Force-quit and relaunch. Expected: the wallet reopens straight to **My
   Wallet** with **no** `LoginScreen` (the `UNLOCKED` status persists in
   SecureStore).
4. Open **Settings**. Expected: there is **no "Sign out"** item (it is gated
   behind `passwordProtect`).

Biometrics disabled (default for this scenario):

5. The biometrics toggle in Settings is **off**. Nothing is written to the
   keychain; relaunch never prompts for biometrics.

Biometrics enabled (still allowed in this mode -- verify it is harmless):

6. In **Settings**, turn **Use biometrics to unlock** on. Expected: the OS may
   show an enrollment/confirmation prompt; `enableBiometrics` stores the key.
   No error.
7. Relaunch. Expected: still opens directly to **My Wallet** with no biometric
   prompt -- because the wallet is never locked in this mode, the stored key is
   simply unused. Confirm the user is **not** stranded.
8. Turn the toggle back **off**. Expected: `resetGenericPassword` clears the
   keychain entry; no error.

> ⚠️ Risk to confirm: in this mode the passphrase is a random UUID the user
> never sees. If the wallet is ever forced into a locked state (e.g. SecureStore
> is cleared by the OS), there is **no password recovery** -- only **Reset
> wallet**. Verify a reset recovers cleanly into a fresh setup.

### Scenario B: `passwordProtect: true` (original LCW behavior)

Setup with biometrics **disabled**:

1. Fresh install. Tap **Create Your Wallet** to reach **Step 1 (Password)**.
   Set a password, leave **Use biometrics to unlock** unchecked, complete setup.
2. Force-quit and relaunch. Expected: `LoginScreen` appears and requires the
   **password**. There is **no** biometric unlock button.
3. Enter the wrong password. Expected: unlock fails (the DB fails to decrypt and
   re-locks); enter the correct password and confirm it unlocks.
4. In **Settings**, tap **Sign out**. Expected: the wallet locks and
   `LoginScreen` is shown again.

Setup with biometrics **enabled**:

5. Fresh install (reset first). Tap **Create Your Wallet**, set a password, and
   **check "Use biometrics to unlock"**. Complete setup -- `enableBiometrics`
   writes the key to the keychain.
6. **Sign out** (Settings), or force-quit and relaunch. On `LoginScreen` tap the
   **biometric unlock** button (Face ID / Touch ID / fingerprint icon).
7. Expected: the **OS biometric prompt** appears with the title "Authenticate to
   unlock your wallet." A successful scan unlocks straight to **My Wallet**.
8. Confirm the password field still works as a fallback on the same screen.

### Biometric prompt edge cases (Scenario B, biometrics enabled)

1. **Cancel the biometric prompt.** Expected: unlock fails with an
   "Authentication was canceled." error; you stay on `LoginScreen` and can retry
   or use the password.
2. **Fail biometrics** (wrong finger / face several times until the OS gives up).
   Expected: surfaces as "Invalid biometrics." and you fall back to the
   password.
3. **Disable biometrics in the OS / unenroll all biometrics**, then relaunch.
   Expected: `getSupportedBiometryType` returns `null`, the biometric unlock
   button disappears, and password-only unlock still works.
4. **Toggle biometrics off in Settings, then on again.** Expected: the keychain
   entry is reset and re-stored; biometric unlock continues to work with the
   current key.
5. **Reset wallet** while biometrics are enabled. Expected: `reset` calls
   `disableBiometrics`, so the keychain entry is cleared and a subsequent fresh
   setup does not silently reuse the old key.

### Platform-specific checks

- **iOS**: verify with both **Face ID** and **Touch ID** capable
  devices/simulators where possible. Confirm the `NSFaceIDUsageDescription`
  string is present (a missing entry crashes the Face ID prompt). The icon
  resolves to `face-recognition` for Face ID and `fingerprint` for Touch ID.
- **Android**: verify with **fingerprint** and, where available, **face unlock**.
  This is the path that the removed `react-native-keychain` patch used to affect
  (it forced Java 8 `compileOptions`; v10 ships Java 17 natively), so a clean
  **Android release build** that installs and runs is itself part of this check.
