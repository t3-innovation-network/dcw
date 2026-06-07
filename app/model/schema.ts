import type { SQLiteDatabase } from 'expo-sqlite'

/**
 * Current schema version. Bump this and add an incremental step in
 * `initSchema` (keyed on `PRAGMA user_version`) whenever the table layout
 * changes -- this is the SQLite analogue of the old Realm `schemaVersion` +
 * `runMigrations` mechanism.
 */
export const SCHEMA_VERSION = 1

/**
 * Table names. Columns mirror the corresponding `*Raw` types: `_id` is the TEXT
 * PRIMARY KEY (a UUID string), dates are stored as ISO-8601 TEXT, and JSON
 * payloads (credential / DID document / verification key) are stored as TEXT.
 */
export const CREDENTIALS_TABLE = 'credentials'
export const PROFILES_TABLE = 'profiles'
export const DIDS_TABLE = 'dids'

/**
 * Creates the wallet tables if they do not yet exist and records the schema
 * version. Idempotent: safe to call on every database open.
 */
export async function initSchema(db: SQLiteDatabase): Promise<void> {
  const { user_version: userVersion } = (await db.getFirstAsync<{
    user_version: number
  }>('PRAGMA user_version')) ?? { user_version: 0 }

  if (userVersion < 1) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${CREDENTIALS_TABLE} (
        _id TEXT PRIMARY KEY NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        rawCredential TEXT NOT NULL,
        profileRecordId TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ${PROFILES_TABLE} (
        _id TEXT PRIMARY KEY NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        profileName TEXT NOT NULL,
        didRecordId TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS ${DIDS_TABLE} (
        _id TEXT PRIMARY KEY NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        rawDidDocument TEXT NOT NULL,
        rawVerificationKey TEXT NOT NULL
      );
      PRAGMA user_version = ${SCHEMA_VERSION};
    `)
  }
}
