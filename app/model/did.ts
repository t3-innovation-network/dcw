import uuid from 'react-native-uuid'

import { db } from './DatabaseAccess'
import { DIDS_TABLE } from './schema'
import { IDidDocument, IKeyPair } from '@interop/data-integrity-core'
import { AddDidRecordParams } from '../lib/did'

export type DidRecordRaw = {
  readonly _id: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly rawDidDocument: string
  readonly didDocument: IDidDocument
  readonly rawVerificationKey: string
  readonly verificationKey: IKeyPair
}

/** Shape of a row as stored in / read from the `dids` table. */
type DidRow = {
  _id: string
  createdAt: string
  updatedAt: string
  rawDidDocument: string
  rawVerificationKey: string
}

function rowToRaw(row: DidRow): DidRecordRaw {
  return {
    _id: row._id,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    rawDidDocument: row.rawDidDocument,
    didDocument: JSON.parse(row.rawDidDocument) as IDidDocument,
    rawVerificationKey: row.rawVerificationKey,
    verificationKey: JSON.parse(row.rawVerificationKey) as IKeyPair
  }
}

export class DidRecord {
  static async addDidRecord({
    didDocument,
    verificationKey
  }: AddDidRecordParams): Promise<DidRecordRaw> {
    const raw: DidRecordRaw = {
      _id: uuid.v4() as string,
      createdAt: new Date(),
      updatedAt: new Date(),
      rawDidDocument: JSON.stringify(didDocument),
      didDocument,
      rawVerificationKey: JSON.stringify(verificationKey),
      verificationKey
    }

    try {
      await db.withInstance((instance) =>
        instance.runAsync(
          `INSERT INTO ${DIDS_TABLE}
            (_id, createdAt, updatedAt, rawDidDocument, rawVerificationKey)
            VALUES (?, ?, ?, ?, ?)`,
          [
            raw._id,
            raw.createdAt.toISOString(),
            raw.updatedAt.toISOString(),
            raw.rawDidDocument,
            raw.rawVerificationKey
          ]
        )
      )
      return raw
    } catch (error) {
      console.error('❌ Error creating DID record:', error)
      throw error
    }
  }

  static getAllDidRecords(): Promise<DidRecordRaw[]> {
    return db.withInstance(async (instance) => {
      const rows = await instance.getAllAsync<DidRow>(
        `SELECT * FROM ${DIDS_TABLE}`
      )
      return rows.map(rowToRaw)
    })
  }

  static async deleteDidRecord(rawDidRecord: DidRecordRaw): Promise<void> {
    await db.withInstance((instance) =>
      instance.runAsync(`DELETE FROM ${DIDS_TABLE} WHERE _id = ?`, [
        rawDidRecord._id
      ])
    )
  }
}
