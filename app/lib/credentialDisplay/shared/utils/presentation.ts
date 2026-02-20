import moment from 'moment'
import type { ImageSourcePropType } from 'react-native'

export function asNonEmptyString(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') {
    const s = value.trim()
    return s.length ? s : null
  }
  const s = `${value}`.trim()
  return s.length ? s : null
}

export function formatMaybeDate(
  value: unknown,
  dateFormat: string
): string | null {
  const s = asNonEmptyString(value)
  if (!s) return null
  const m = moment(s)
  return m.isValid() ? m.format(dateFormat) : s
}
