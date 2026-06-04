import { IVerifiableCredential } from '@interop/data-integrity-core'

export const volunteeringCredential: IVerifiableCredential = {
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    {
      '@vocab': 'https://schema.hropenstandards.org/4.4/',
      fullName: 'https://schema.org/name',
      persons: 'https://schema.org/name',
      volunteerWork: 'https://schema.org/roleName',
      volunteerOrg: 'https://schema.org/organization',
      volunteerDescription: 'https://schema.org/description',
      skillsGained: {
        '@id': 'https://schema.org/skills',
        '@container': '@list'
      },
      duration: 'https://schema.org/duration',
      volunteerDates: 'https://schema.org/temporalCoverage',
      portfolio: {
        '@id': 'https://schema.org/hasPart',
        '@container': '@list'
      },
      name: 'https://schema.org/name',
      url: 'https://schema.org/url',
      evidenceLink: 'https://schema.org/url',
      evidenceDescription: 'https://schema.org/description'
    },
    'https://w3id.org/security/suites/ed25519-2020/v1'
  ],
  id: 'urn:69ef787ea83065a71c4bf42adeca9730f71e59e5b09fc020fd0451379eb3dbc3',
  type: ['VerifiableCredential', 'VolunteeringCredential'],
  issuer: {
    id: 'did:key:z6MkprqTpV9jXkAQxFxbA8BVSUgmiobgdq9qTsHGsgMjN1vD',
    type: ['Profile']
  },
  issuanceDate: '2026-03-18T18:21:05.689Z',
  credentialSubject: {
    type: ['VolunteerRole'],
    fullName: 'Omar',
    volunteerWork: 'Testing Role',
    volunteerOrg: 'Testing Organization',
    volunteerDescription:
      'Testing description. Testing description. Testing description.',
    skillsGained: [
      'Testing skills gained through volunteering and practical teamwork.'
    ],
    duration: '4 years',
    volunteerDates: '',
    portfolio: [
      {
        name: 'omar-fullstack-resume.pdf',
        url: 'https://drive.google.com/uc?export=view&id=1Zkpbg-U_VkgY2CupIx7izW00DeCZJci9'
      }
    ],
    evidenceLink:
      'https://drive.google.com/uc?export=view&id=1Zkpbg-U_VkgY2CupIx7izW00DeCZJci9',
    evidenceDescription: ''
  },
  proof: {
    type: 'Ed25519Signature2020',
    created: '2026-03-18T18:21:05Z',
    verificationMethod:
      'did:key:z6MkprqTpV9jXkAQxFxbA8BVSUgmiobgdq9qTsHGsgMjN1vD#z6MkprqTpV9jXkAQxFxbA8BVSUgmiobgdq9qTsHGsgMjN1vD',
    proofPurpose: 'assertionMethod',
    proofValue:
      'z4RrJfvMx2wtf3NtBDRkZ9ksHudtQ7EVEx2qk9wYB1stdphzabiRwpzgL4d1xSrTSZxD83MAUKs3vibjpqiDsS2cu'
  }
}
