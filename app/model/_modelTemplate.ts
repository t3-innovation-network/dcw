/**
 * Template for database objects (expo-sqlite + SQLCipher).
 * Replace values:
 *   - Entity / entity
 *   - entities (table name)
 *
 * NOTE: add the table's `CREATE TABLE` statement to `initSchema` in
 * `./schema.ts` (and bump `SCHEMA_VERSION` if changing an existing schema).
 */

import uuid from 'react-native-uuid'

import { db } from './DatabaseAccess'

const ENTITIES_TABLE = 'entities'

export type EntityRecordRaw = {
  readonly _id: string
  readonly createdAt: Date
  readonly updatedAt: Date
}

/** Shape of a row as stored in / read from the `entities` table. */
type EntityRow = {
  _id: string
  createdAt: string
  updatedAt: string
}

function rowToRaw(row: EntityRow): EntityRecordRaw {
  return {
    _id: row._id,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt)
  }
}

export class EntityRecord {
  public static async addEntityRecord(): Promise<EntityRecordRaw> {
    const raw: EntityRecordRaw = {
      _id: uuid.v4() as string,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    await db.withInstance((instance) =>
      instance.runAsync(
        `INSERT INTO ${ENTITIES_TABLE} (_id, createdAt, updatedAt)
          VALUES (?, ?, ?)`,
        [raw._id, raw.createdAt.toISOString(), raw.updatedAt.toISOString()]
      )
    )

    return raw
  }

  public static async getAllEntityRecords(): Promise<EntityRecordRaw[]> {
    return db.withInstance(async (instance) => {
      const rows = await instance.getAllAsync<EntityRow>(
        `SELECT * FROM ${ENTITIES_TABLE}`
      )
      return rows.map(rowToRaw)
    })
  }

  public static async deleteEntityRecord(
    rawEntityRecord: EntityRecordRaw
  ): Promise<void> {
    await db.withInstance((instance) =>
      instance.runAsync(`DELETE FROM ${ENTITIES_TABLE} WHERE _id = ?`, [
        rawEntityRecord._id
      ])
    )
  }
}
