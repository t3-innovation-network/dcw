# Manual Testing Script

Step-by-step scripts for exercising wallet features by hand on a real device or
simulator. These cover flows that the automated Jest / `test-node` suites cannot
fully verify -- anything that depends on native modules, the OS file system, or
real user interaction.

> Run these on an actual build (`expo run:ios` / `expo run:android` or a dev
> client). The picker, file system, and secure storage are native modules and do
> not exist in the Jest environment.

## Testing the Document Picker

The wallet reads files through the OS document picker
(`@react-native-documents/picker`) in `app/lib/import.ts` (`pickAndReadFile`).
There are three places in the UI that open it, and the platform-specific copy
logic differs, so test on **both iOS and Android**.

### What is being exercised

- `pick()` opens the native picker and returns the chosen file.
- On **iOS**, the wallet then calls `keepLocalCopy({ destination:
  'cachesDirectory' })` to stage a readable copy, then reads it.
- On **Android**, a `content://` URI is copied into the temporary directory via
  `react-native-fs`; a plain `file://` URI is read directly.
- The file contents are then routed by type (JSON credential / profile / wallet
  array, PNG OpenBadge, or `.tar` wallet backup).

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

1. Go to **Settings → Manage Profiles → Add Existing Profile**.
2. Tap **Restore from a file**.
3. Select a single-profile export `.json` file.
4. Expected: an **Existing Profile Details** report, and the profile appears in
   the Manage Profiles list.

### Test files to cover

Run entry point 1 against each of these to exercise the type-routing in
`readFile`:

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
