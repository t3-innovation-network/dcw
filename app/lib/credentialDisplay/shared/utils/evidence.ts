export type PortfolioEvidenceItem = { name: string; url: string }

export function portfolioEvidenceFrom(
  raw: unknown
): Array<PortfolioEvidenceItem> {
  const items = raw ? [raw] : []

  return items
    .map((item: unknown) => {
      if (typeof item === 'string') {
        const url = item.trim()
        if (!url) return null
        return { name: url, url }
      }

      if (!item || typeof item !== 'object') return null

      const rawUrl = (item as any).url ?? (item as any).id ?? ''
      const url = (typeof rawUrl === 'string' ? rawUrl : `${rawUrl}`).trim()
      if (!url) return null

      const rawName = (item as any).name ?? ''
      const name = (typeof rawName === 'string' ? rawName : `${rawName}`).trim()
      return { name: name || url, url }
    })
    .filter(Boolean) as Array<PortfolioEvidenceItem>
}
