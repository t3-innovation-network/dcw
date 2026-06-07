# Database migration how-to (expo-sqlite + SQLCipher)

This wallet stores its data in an encrypted SQLite database via `expo-sqlite`
with SQLCipher (since the Realm removal). This document explains how schema
migrations work here, what SQLite does and does **not** do for you, and the
concrete steps to write a future migration.

The model layer that owns all of this lives in `app/model/` -- specifically
`app/model/schema.ts` (table definitions + versioning) and
`app/model/DatabaseAccess.ts` (connection open, `PRAGMA key`, calls
`initSchema`).

## Unlike Realm, SQLite has no migration framework

Realm gave us a declarative `schema` + `schemaVersion` plus an
`onMigration(oldRealm, newRealm)` callback that diffed the old and new schemas
and let us transform data during the upgrade. Adding/removing a property was
largely automatic; Realm dropped removed columns for us.

`expo-sqlite` gives you a raw SQL connection and **nothing else**. There is:

- **no** automatic schema diffing,
- **no** column add/drop inference,
- **no** migration runner,
- **no** declarative schema.

What it provides amounts to two thin conveniences, neither of which is a
migration system:

1. **`onInit` hook** -- only on the React `SQLiteProvider` / `useSQLiteContext`
   path. Its own typedef
   (`node_modules/expo-sqlite/build/hooks.d.ts`) documents it as "You can use
   this to run database migrations or other setup tasks." It is just a callback
   that fires once after open; **you** write the migration logic inside it. This
   app does **not** use the provider -- we run our equivalent from
   `DatabaseAccess.instance()` instead.
2. **`PRAGMA user_version`** -- a SQLite built-in integer stored in the database
   file header. `expo-sqlite` never touches it; it is simply the conventional
   place to record "what schema version is this DB at." This replaces Realm's
   `schemaVersion`.

## The pattern we use

`initSchema(db)` in `app/model/schema.ts` reads `PRAGMA user_version` and runs
forward-only steps to bring the DB up to `SCHEMA_VERSION`, bumping
`user_version` as it goes. It is called on every database open (right after
`PRAGMA key`), and is idempotent.

Adding a migration is: add a new version-guarded block and bump
`SCHEMA_VERSION`.

```ts
// in initSchema(db)
const { user_version } = (await db.getFirstAsync<{ user_version: number }>(
  'PRAGMA user_version'
)) ?? { user_version: 0 }

if (user_version < 1) {
  await db.execAsync(`CREATE TABLE ...; PRAGMA user_version = 1;`)
}
if (user_version < 2) {
  // e.g.
  // await db.execAsync(
  //   `ALTER TABLE credentials ADD COLUMN foo TEXT; PRAGMA user_version = 2;`
  // )
}
// ... each step guarded by the version it upgrades *to*
```

### Rules that matter

- **Steps are forward-only and cumulative.** A fresh install runs every step in
  sequence (0 -> 1 -> 2). An existing install at v1 runs only the `< 2` step.
  **Never edit a shipped step** -- add a new one. Editing a past step means
  devices that already ran it will never pick up the change.
- **Always set `PRAGMA user_version` at the end of each step**, ideally inside
  the same statement batch / transaction as the step's DDL, so an interrupted
  migration is not recorded as complete.
- **Migrations run against an already-decrypted connection.** `PRAGMA key`
  precedes `initSchema` in `DatabaseAccess.instance()`, so no key handling is
  needed inside a migration step.
- **Wrap multi-statement / data-moving steps in a transaction**
  (`db.withTransactionAsync(...)`) so a half-applied migration cannot leave the
  DB in a broken state. A single `execAsync` of a `;`-separated batch runs
  atomically and is fine for simple `CREATE TABLE` / `ADD COLUMN` steps.

## Worked example: adding a new table (the easy, additive case)

Suppose we later add a `share_events` table to record when a public link is
created or a credential is shared to an outside party. Adding a brand-new table
is the simplest kind of migration: it is purely additive, so existing tables and
rows are untouched, no rebuild dance is needed, and there is no risk of data
loss.

Bump `SCHEMA_VERSION` to `2` and add the version-guarded step:

```ts
// app/model/schema.ts

export const SCHEMA_VERSION = 2
export const SHARE_EVENTS_TABLE = 'share_events'

export async function initSchema(db: SQLiteDatabase): Promise<void> {
  const { user_version } = (await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  )) ?? { user_version: 0 }

  if (user_version < 1) {
    // ...original credentials / profiles / dids tables...
    // PRAGMA user_version = 1;
  }

  if (user_version < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${SHARE_EVENTS_TABLE} (
        _id TEXT PRIMARY KEY NOT NULL,
        createdAt TEXT NOT NULL,
        credentialRecordId TEXT NOT NULL,
        profileRecordId TEXT NOT NULL,
        shareType TEXT NOT NULL,          -- e.g. 'public-link' | 'direct'
        target TEXT                       -- nullable: link URL or recipient
      );
      PRAGMA user_version = 2;
    `)
  }
}
```

### Does this run when a user updates the app over an existing database?

Yes. The step is keyed on the **database file's** `user_version`, not on the app
version or the install event. An App Store update replaces the app binary but
does **not** wipe the app's data directory -- the existing SQLite file (and the
SecureStore key + PBKDF2 salt) all survive. So:

1. The user updates and launches the app. The DB file still exists, so they land
   on the unlock screen (`isInitialized()` is true).
2. They unlock. `unlock()` -> `DatabaseAccess.instance()` opens the file, issues
   `PRAGMA key`, then calls `initSchema`.
3. `initSchema` reads `user_version` = `1`, skips the `< 1` block (already
   applied), runs the `< 2` block to create `share_events`, and bumps
   `user_version` to `2`.
4. Every later open reads `2` and skips both blocks.

A brand-new user instead starts at `user_version` = `0` and runs **both** steps
in sequence (0 -> 1 -> 2) on first launch. Both paths converge on the same
schema.

Two things to remember for this case:

- **It runs at unlock, not at app launch.** `instance()` is only reached after
  the encryption key is available, because you cannot create a table in the DB
  until it is decrypted. The new table therefore appears the first time the user
  successfully unlocks after updating -- there is no way (and no need) to run a
  migration before unlock.
- This is unrelated to the "no Realm -> SQLite data migration" caveat below. That
  caveat was only about the one-time Realm cutover at the v0 -> v1 boundary. From
  v1 onward, ordinary SQLite-to-SQLite migrations like this one **do** run
  against the existing, populated database and preserve all data.

## SQLite's `ALTER TABLE` is limited

This is the biggest day-to-day difference from Realm. SQLite's `ALTER TABLE`
supports only:

- `ALTER TABLE t ADD COLUMN ...`
- `ALTER TABLE t RENAME TO ...`
- `ALTER TABLE t RENAME COLUMN a TO b`
- `ALTER TABLE t DROP COLUMN ...` (newer SQLite only; with constraints)

It **cannot** change a column's type, change/remove constraints, reorder
columns, or otherwise alter an existing column in place. Realm hid all of this.

### The standard SQLite "12-step" table rebuild dance

When a change is not expressible as a simple `ADD COLUMN` (e.g. changing a
column type, dropping a column on older SQLite, adding/removing a NOT NULL or
PRIMARY KEY constraint), you must rebuild the table:

1. Create a **new** table with the desired final schema, under a temporary name.
2. Copy data across with `INSERT INTO new_table (...) SELECT ... FROM old_table`
   (this is where you transform/backfill values -- the SQLite equivalent of
   Realm's `onMigration` data step).
3. **Drop** the old table.
4. **Rename** the new table to the old table's name.
5. Recreate any indexes/triggers that lived on the old table.

Always wrap this whole sequence in a single transaction. Sketch:

```ts
await db.withTransactionAsync(async () => {
  await db.execAsync(`
    CREATE TABLE credentials_new (
      _id TEXT PRIMARY KEY NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      rawCredential TEXT NOT NULL,
      profileRecordId TEXT NOT NULL
      -- ...new/changed columns here...
    );
  `)
  await db.execAsync(`
    INSERT INTO credentials_new (_id, createdAt, updatedAt, rawCredential, profileRecordId)
    SELECT _id, createdAt, updatedAt, rawCredential, profileRecordId FROM credentials;
  `)
  await db.execAsync(`DROP TABLE credentials;`)
  await db.execAsync(`ALTER TABLE credentials_new RENAME TO credentials;`)
  await db.execAsync(`PRAGMA user_version = 2;`)
})
```

> Note: if the rebuilt table is referenced by foreign keys, follow SQLite's full
> documented procedure (toggle `PRAGMA foreign_keys` around the rebuild). This
> app's tables currently have no declared FK constraints, so the simpler form
> above applies.

## Project-specific caveat: no Realm -> SQLite data migration

Per the Realm-removal plan, there is **no** migration from the old Realm
database. Updating users got a fresh `v0 -> v1` SQLite DB and recover their data
via an exported JSON backup or WAS. Therefore `user_version` here governs only
**future SQLite-to-SQLite schema changes**, not the Realm cutover.
