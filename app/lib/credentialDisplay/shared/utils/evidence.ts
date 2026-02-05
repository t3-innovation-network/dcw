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

      const url = String((item as any).url ?? (item as any).id ?? '').trim()
      if (!url) return null

      const name = String((item as any).name ?? '').trim()
      return { name: name ?? url, url }
    })
    .filter(Boolean) as Array<PortfolioEvidenceItem>
}
