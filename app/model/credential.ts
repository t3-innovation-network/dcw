import uuid from 'react-native-uuid'

import { CredentialRecordRaw } from '../types/credential'
import { db } from './DatabaseAccess'
import { CREDENTIALS_TABLE } from './schema'
import { IVerifiableCredential } from '@interop/data-integrity-core'

/** Shape of a row as stored in / read from the `credentials` table. */
type CredentialRow = {
  _id: string
  createdAt: string
  updatedAt: string
  rawCredential: string
  profileRecordId: string
}

function rowToRaw(row: CredentialRow): CredentialRecordRaw {
  return {
    _id: row._id,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
    rawCredential: row.rawCredential,
    credential: JSON.parse(row.rawCredential) as IVerifiableCredential,
    profileRecordId: row.profileRecordId
  }
}

export class CredentialRecord {
  static rawFrom({
    credential,
    profileRecordId
  }: AddCredentialRecordParams): CredentialRecordRaw {
    return {
      _id: uuid.v4() as string,
      createdAt: new Date(),
      updatedAt: new Date(),
      rawCredential: JSON.stringify(credential),
      credential,
      profileRecordId
    }
  }

  static async addCredentialRecord(
    params: AddCredentialRecordParams
  ): Promise<CredentialRecordRaw> {
    const raw = CredentialRecord.rawFrom(params)

    await db.withInstance((instance) =>
      instance.runAsync(
        `INSERT INTO ${CREDENTIALS_TABLE}
          (_id, createdAt, updatedAt, rawCredential, profileRecordId)
          VALUES (?, ?, ?, ?, ?)`,
        [
          raw._id,
          raw.createdAt.toISOString(),
          raw.updatedAt.toISOString(),
          raw.rawCredential,
          raw.profileRecordId
        ]
      )
    )

    return raw
  }

  static getAllCredentialRecords(): Promise<CredentialRecordRaw[]> {
    return db.withInstance(async (instance) => {
      const rows = await instance.getAllAsync<CredentialRow>(
        `SELECT * FROM ${CREDENTIALS_TABLE}`
      )
      return rows.map(rowToRaw)
    })
  }

  static async deleteCredentialRecord(
    rawCredentialRecord: CredentialRecordRaw
  ): Promise<void> {
    await db.withInstance((instance) =>
      instance.runAsync(`DELETE FROM ${CREDENTIALS_TABLE} WHERE _id = ?`, [
        rawCredentialRecord._id
      ])
    )
  }
}

export type AddCredentialRecordParams = {
  credential: IVerifiableCredential
  profileRecordId: string
}
