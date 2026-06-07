export type PortfolioEvidenceItem = { name: string; url: string }

/** Evidence item from W3C VC evidence array: { id, type, name } */
export type VCEvidenceItem = {
  id: string
  type?: string
  name?: string
}

/** VC with top-level evidence array (W3C / IMS OB spec) */
export type VCWithEvidence = {
  evidence?: unknown
  credentialSubject?: unknown
}

/** Parses a single evidence item into { name, url } */
function parseEvidenceItem(item: unknown): PortfolioEvidenceItem | null {
  if (typeof item === 'string') {
    const url = item.trim()
    if (!url) return null
    return { name: url, url }
  }

  if (!item || typeof item !== 'object') return null

  const rawUrl =
    (item as Record<string, unknown>).url ??
    (item as Record<string, unknown>).id ??
    ''
  const url = (typeof rawUrl === 'string' ? rawUrl : `${rawUrl}`).trim()
  if (!url) return null

  const rawName = (item as Record<string, unknown>).name ?? ''
  const name = (typeof rawName === 'string' ? rawName : `${rawName}`).trim()
  return { name: name || url, url }
}

/** Extracts evidence from raw array/object (legacy portfolioEvidenceFrom behavior) */
export function portfolioEvidenceFrom(
  raw: unknown
): Array<PortfolioEvidenceItem> {
  const items = Array.isArray(raw) ? raw : [raw]
  return items
    .map(parseEvidenceItem)
    .filter(Boolean) as Array<PortfolioEvidenceItem>
}

/** Extracts evidence from credential: prefers credential.evidence, falls back to subject.portfolio */
export function evidenceFromCredential(
  credential: VCWithEvidence,
  subject?: unknown
): Array<PortfolioEvidenceItem> {
  const fromEvidence = credential?.evidence
  if (fromEvidence && Array.isArray(fromEvidence) && fromEvidence.length > 0) {
    return portfolioEvidenceFrom(fromEvidence)
  }
  const rawSubject = credential?.credentialSubject
  const subj =
    subject ?? (Array.isArray(rawSubject) ? rawSubject[0] : rawSubject)
  const portfolio =
    subj && typeof subj === 'object' && 'portfolio' in subj
      ? (subj as { portfolio?: unknown }).portfolio
      : undefined
  return portfolioEvidenceFrom(portfolio)
}
