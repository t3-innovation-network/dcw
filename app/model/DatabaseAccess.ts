import * as SQLite from 'expo-sqlite'
import * as SecureStore from 'expo-secure-store'
import * as RNFS from 'react-native-fs'

import {
  resetBiometricKeychain,
  retrieveFromBiometricKeychain,
  storeInBiometricKeychain
} from '../lib/biometrics'
import { initSchema } from './schema'
import { pbkdf2 } from '@noble/hashes/pbkdf2.js'
import { sha512 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'

const DATABASE_NAME = 'edu-wallet.db'

const PRIVILEGED_KEY_KID = 'privileged_key'
const PRIVILEGED_KEY_STATUS_ID = 'privileged_key_status'
const UNLOCKED = 'unlocked'
const LOCKED = 'locked'

const BIOMETRICS_STATUS = 'biometrics_status'
const ENABLED = 'enabled'
const DISABLED = 'disabled'

const PBKDF2_ITERATIONS = 10000
const PBKDF2_SALT_PATH = `${RNFS.DocumentDirectoryPath}/edu-wallet-salt`

class DatabaseAccess {
  /**
   * Do not store off the instance from withInstance for any reason. If you need
   * to do work on the database, do all of it within the callback to withInstance.
   */
  public static async withInstance<T>(
    callback: (instance: SQLite.SQLiteDatabase) => T | Promise<T>
  ): Promise<T> {
    const database = await DatabaseAccess.instance()

    return callback(database)
  }

  public static async isUnlocked(): Promise<boolean> {
    try {
      const keyStatus = await SecureStore.getItemAsync(PRIVILEGED_KEY_STATUS_ID)

      return keyStatus === UNLOCKED
    } catch (err) {
      console.error(err)
      return false
    }
  }

  public static async isBiometricsEnabled(): Promise<boolean> {
    const biometricsStatus = await SecureStore.getItemAsync(BIOMETRICS_STATUS)
    return biometricsStatus === ENABLED
  }

  public static async unlockWithBiometrics(): Promise<void> {
    if (!(await this.isBiometricsEnabled)) {
      throw new Error('Biometric authentication is not enabled.')
    }

    const key = await retrieveFromBiometricKeychain()

    await Promise.all([
      SecureStore.setItemAsync(PRIVILEGED_KEY_STATUS_ID, UNLOCKED),
      SecureStore.setItemAsync(PRIVILEGED_KEY_KID, key)
    ])

    // Attempt database decryption to see if key is valid
    try {
      await DatabaseAccess.instance()
    } catch (err) {
      await DatabaseAccess.lock()

      throw err
    }
  }

  public static async enableBiometrics(): Promise<void> {
    const key = await SecureStore.getItemAsync(PRIVILEGED_KEY_KID)

    if (key === null) {
      throw new Error('The wallet must be unlocked to enable biometrics')
    }

    await storeInBiometricKeychain(key)
    await SecureStore.setItemAsync(BIOMETRICS_STATUS, ENABLED)
  }

  public static async disableBiometrics(): Promise<void> {
    await resetBiometricKeychain()
    await SecureStore.setItemAsync(BIOMETRICS_STATUS, DISABLED)
  }

  /**
   * This generates the key to unlock the wallet and stores it
   * in SecureStorage. Please adhere to these guidelines:
   *   1. Never store/persist the passphrase. It should only exist in input an
   *      the variable passed to this function.
   *   2. Never store the key generated in any place but SecureStorage
   */
  public static async unlock(passphrase: string): Promise<void> {
    if (await this.isUnlocked()) return

    const key = pbkdf2(sha512, passphrase, await DatabaseAccess.salt(), {
      c: PBKDF2_ITERATIONS,
      dkLen: 32
    })
    // each byte is 2 hex characters, reaching the necessary 64 characters
    const keyString = bytesToHex(key)
    await Promise.all([
      SecureStore.setItemAsync(PRIVILEGED_KEY_STATUS_ID, UNLOCKED),
      SecureStore.setItemAsync(PRIVILEGED_KEY_KID, keyString)
    ])

    // Attempt database decryption to see if key is valid
    try {
      await DatabaseAccess.instance()
    } catch (err) {
      await DatabaseAccess.lock()

      throw err
    }
  }

  public static async lock(): Promise<void> {
    if (!(await this.isUnlocked())) return

    if (DatabaseAccess.database !== null) {
      await DatabaseAccess.database.closeAsync()
      DatabaseAccess.database = null
    }

    await Promise.all([
      SecureStore.setItemAsync(PRIVILEGED_KEY_STATUS_ID, LOCKED),
      SecureStore.setItemAsync(PRIVILEGED_KEY_KID, '')
    ])
  }

  public static async isInitialized(): Promise<boolean> {
    /**
     * The PBKDF2 salt is written in `initialize()` and removed in `reset()`, so
     * it tracks the database lifecycle 1:1. Checking for it avoids any knowledge
     * of expo-sqlite's internal storage location, and works whether or not the
     * wallet is currently unlocked.
     */
    return RNFS.exists(PBKDF2_SALT_PATH)
  }

  /**
   * WARNING: Calling these two functions are destructive. They will wipe out the
   * existing salt and database.
   */
  public static async reset(): Promise<void> {
    if (await DatabaseAccess.isUnlocked()) {
      throw new Error('Cannot reset unlocked wallet.')
    }

    await DatabaseAccess.disableBiometrics()

    // Remove the database file, the derived-key salt, and any persisted key
    // material. SecureStore (the Keychain on iOS) survives app reinstalls, so a
    // reset must explicitly clear it -- otherwise a stale `unlocked` status or
    // key is left behind and the next initialize fails.
    await Promise.all([
      DatabaseAccess.deleteDatabaseIfExists(),
      DatabaseAccess.unlinkIfExists(PBKDF2_SALT_PATH),
      SecureStore.deleteItemAsync(PRIVILEGED_KEY_STATUS_ID),
      SecureStore.deleteItemAsync(PRIVILEGED_KEY_KID)
    ])
  }

  private static async deleteDatabaseIfExists(): Promise<void> {
    try {
      await SQLite.deleteDatabaseAsync(DATABASE_NAME)
    } catch {
      // deleteDatabaseAsync throws if the database file does not exist; that is
      // the desired end state, so swallow the error.
    }
  }

  private static async unlinkIfExists(path: string): Promise<void> {
    if (await RNFS.exists(path)) {
      await RNFS.unlink(path)
    }
  }

  public static async initialize(passphrase: string): Promise<void> {
    if (await DatabaseAccess.isUnlocked()) {
      throw new Error('Cannot initialize unlocked wallet.')
    }

    if (await DatabaseAccess.isInitialized()) {
      throw new Error('Wallet must be in reset state to be initialized')
    }

    const decoder = new TextDecoder()
    const rawSalt = crypto.getRandomValues(new Uint8Array(64))
    const salt: string = decoder.decode(rawSalt)

    await RNFS.writeFile(PBKDF2_SALT_PATH, salt, 'utf8')

    // The first call to unlock will create/encrypt the database with the pass.
    // We intentionally leave the wallet unlocked: callers initialize and then
    // immediately use the wallet, and unlock() is expensive (PBKDF2 key
    // derivation + encrypted database open). Locking here would force callers to
    // pay that cost a second time on the very next unlock().
    await DatabaseAccess.unlock(passphrase)
  }

  private static async keyHex(): Promise<string> {
    if (!(await this.isUnlocked())) {
      throw new Error('Wallet is not unlocked.')
    }

    const key = await SecureStore.getItemAsync(PRIVILEGED_KEY_KID)

    if (key === null || key === '') {
      throw new Error('Key not present in keychain.')
    }

    // The stored key is already a 64-char hex string (32 bytes), which SQLCipher
    // accepts directly as a raw key -- no further derivation needed.
    return key
  }

  private static async salt(): Promise<string> {
    return RNFS.readFile(PBKDF2_SALT_PATH, 'utf8')
  }

  private static database: SQLite.SQLiteDatabase | null = null
  private static async instance(): Promise<SQLite.SQLiteDatabase> {
    if (DatabaseAccess.database !== null) {
      return DatabaseAccess.database
    }

    const database = await SQLite.openDatabaseAsync(DATABASE_NAME)

    // `PRAGMA key` must be the first statement issued after open. SQLCipher does
    // not validate the key here; an invalid key surfaces on the first real query
    // (initSchema below), which lets unlock()/unlockWithBiometrics() detect a
    // bad passphrase by attempting to open the database.
    await database.execAsync(
      `PRAGMA key = "x'${await DatabaseAccess.keyHex()}'"`
    )

    try {
      await initSchema(database)
    } catch (err) {
      await database.closeAsync()
      throw err
    }

    return (DatabaseAccess.database = database)
  }
}

export { DatabaseAccess as db }
