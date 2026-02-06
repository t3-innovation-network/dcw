import { portfolioEvidenceFrom } from '../app/lib/credentialDisplay/shared/utils/evidence'

describe('portfolioEvidenceFrom', () => {
  it('parses evidence array of objects', () => {
    const raw = [
      {
        '@type': 'schema:CreativeWork',
        name: 'Fake Evidence Link1',
        url: 'https://google.com/'
      },
      {
        '@type': 'schema:CreativeWork',
        name: 'Fake Evidence Link2',
        url: 'https://youtube.com/'
      },
      {
        '@type': 'schema:CreativeWork',
        name: 'Omar Soliman Resume (2).pdf',
        url: 'https://drive.google.com/uc?export=view&id=1_dHT1NlFLG8ec4rLDFaxsVo6j97BL0-7'
      },
      {
        '@type': 'schema:CreativeWork',
        name: 'Omar Soliman Specialization.png',
        url: 'https://drive.google.com/uc?export=view&id=1eRZR2HcArJ-lngUUfN7rMPnvrOtro_fG'
      }
    ]

    expect(portfolioEvidenceFrom(raw)).toEqual([
      { name: 'Fake Evidence Link1', url: 'https://google.com/' },
      { name: 'Fake Evidence Link2', url: 'https://youtube.com/' },
      {
        name: 'Omar Soliman Resume (2).pdf',
        url: 'https://drive.google.com/uc?export=view&id=1_dHT1NlFLG8ec4rLDFaxsVo6j97BL0-7'
      },
      {
        name: 'Omar Soliman Specialization.png',
        url: 'https://drive.google.com/uc?export=view&id=1eRZR2HcArJ-lngUUfN7rMPnvrOtro_fG'
      }
    ])
  })

  it('parses a string url item inside the array', () => {
    expect(portfolioEvidenceFrom([' https://example.com/foo '])).toEqual([
      { name: 'https://example.com/foo', url: 'https://example.com/foo' }
    ])
  })

  it('drops items without a valid url (avoids "undefined" urls)', () => {
    const raw = [
      { name: 'bad', url: undefined },
      { name: 'also bad', url: null },
      { name: 'good', url: 'https://example.com/' }
    ]

    expect(portfolioEvidenceFrom(raw)).toEqual([
      { name: 'good', url: 'https://example.com/' }
    ])
  })

  it('falls back to url as name when name is missing or empty', () => {
    expect(
      portfolioEvidenceFrom([
        { name: '', url: 'https://example.com/a' },
        { url: 'https://example.com/b' }
      ])
    ).toEqual([
      { name: 'https://example.com/a', url: 'https://example.com/a' },
      { name: 'https://example.com/b', url: 'https://example.com/b' }
    ])
  })

  it('drops null, undefined, and non-object items', () => {
    expect(
      portfolioEvidenceFrom([
        null,
        undefined,
        123,
        true,
        { url: 'https://example.com' }
      ])
    ).toEqual([{ name: 'https://example.com', url: 'https://example.com' }])
  })

  it('returns an empty array for empty or invalid input', () => {
    expect(portfolioEvidenceFrom([])).toEqual([])
    expect(portfolioEvidenceFrom(null)).toEqual([])
    expect(portfolioEvidenceFrom(undefined)).toEqual([])
  })
})
