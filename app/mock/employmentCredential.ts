import { IVerifiableCredential } from '@digitalcredentials/ssi'

export const employmentCredential: IVerifiableCredential = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    {
      '@vocab': 'https://schema.hropenstandards.org/4.4/',
      fullName: 'https://schema.org/name',
      persons: 'https://schema.org/name',
      credentialName: 'https://schema.org/jobTitle',
      credentialDuration: 'https://schema.org/duration',
      credentialDescription: 'https://schema.org/description',
      portfolio: {
        '@id': 'https://schema.org/hasPart',
        '@container': '@list'
      },
      name: 'https://schema.org/name',
      url: 'https://schema.org/url',
      evidenceLink: 'https://schema.org/url',
      evidenceDescription: 'https://schema.org/description',
      company: 'https://schema.org/worksFor',
      role: 'https://schema.org/jobTitle'
    },
    'https://w3id.org/security/suites/ed25519-2020/v1'
  ],
  id: 'urn:fbbc2ede8f3eb453cf482fcafa8ae9be5ab279ae41a76c6d4901c11d0c381f9c',
  type: ['VerifiableCredential', 'EmploymentCredential'],
  issuer: {
    id: 'did:key:z6MkuNnnXY4rwy98NQncYjhHvJem8anNpwJaW6KbSfgMtUJC',
    type: ['Profile']
  },
  issuanceDate: '2026-03-17T17:14:15.286Z',
  credentialSubject: {
    type: ['WorkExperience'],
    fullName: 'Omar',
    portfolio: [
      {
        name: 'employment-evidence.pdf',
        url: 'https://drive.google.com/uc?export=view&id=151piQySfHfJnz8OhfjqDEyO8A1AsC-Ol'
      }
    ],
    evidenceLink:
      'https://drive.google.com/uc?export=view&id=151piQySfHfJnz8OhfjqDEyO8A1AsC-Ol',
    evidenceDescription: '',
    company: 'testing company',
    role: 'co founder testing company'
  },
  proof: {
    type: 'Ed25519Signature2020',
    created: '2026-03-17T17:14:15Z',
    verificationMethod:
      'did:key:z6MkuNnnXY4rwy98NQncYjhHvJem8anNpwJaW6KbSfgMtUJC#z6MkuNnnXY4rwy98NQncYjhHvJem8anNpwJaW6KbSfgMtUJC',
    proofPurpose: 'assertionMethod',
    proofValue:
      'z5gv4pVeNAnHm7Zj7spoPcyjmcreK7YheSvKrTUArBbqUsbyHFKqMcgpPZ85SxU5Z4yLND2d6qGY1GBRSAE4idrdd'
  }
}
