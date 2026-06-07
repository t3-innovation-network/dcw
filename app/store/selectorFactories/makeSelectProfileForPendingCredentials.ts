import { createSelector } from '@reduxjs/toolkit'
import { ProfileRecordRaw } from '../../model'
import { selectRawProfileRecords } from '../slices/profile'
import { Selector } from '.'
import {
  PendingCredential,
  selectPendingCredentials
} from '../slices/credentialFoyer'
import { selectRawDidRecords } from '../slices/did'

export const makeSelectProfileForPendingCredentials = (): Selector<
  undefined,
  ProfileRecordRaw | null
> =>
  createSelector(
    [selectRawProfileRecords, selectRawDidRecords, selectPendingCredentials],
    (rawProfileRecords, rawDidRecords, pendingCredentials) => {
      const didKey = reduceCommonDidKeyFrom(pendingCredentials)

      if (didKey) {
        const rawDidRecord = rawDidRecords.find(
          ({ didDocument }) => didDocument.id === didKey
        )
        if (rawDidRecord) {
          const rawProfileRecord =
            rawProfileRecords.find(
              ({ didRecordId }) => didRecordId === rawDidRecord._id
            ) || null
          return rawProfileRecord
        }
      }

      return null
    }
  )

export function didKeyFrom(
  pendingCredential: PendingCredential
): string | null {
  const { credentialSubject } = pendingCredential.credential
  if (!credentialSubject) {
    return null
  }
  const subjects = Array.isArray(credentialSubject)
    ? credentialSubject
    : [credentialSubject]
  return subjects[0]?.id || null
}

function reduceCommonDidKeyFrom(
  pendingCredentials: PendingCredential[]
): string | null {
  if (pendingCredentials.length === 0) return null
  if (pendingCredentials.length === 1) return didKeyFrom(pendingCredentials[0])

  return pendingCredentials.reduce<string | null>((did, pendingCredential) => {
    return did === didKeyFrom(pendingCredential) ? did : null
  }, didKeyFrom(pendingCredentials[0]))
}
