import React, { useMemo } from 'react'
import { ScrollView, View, Text, Linking } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

import { NavHeader } from '../../components'
import { useDynamicStyles, useVerifyCredential } from '../../hooks'
import dynamicStyleSheet from './ResumePreviewScreen.styles'
import type { CredentialRecordRaw } from '../../types/credential'

type ResumePreviewScreenProps = {
  navigation: any
  route: { params: { rawCredentialRecord: CredentialRecordRaw } }
}

type ResumeNarrative = { narrative?: string; text?: string }
type ResumeProfessionalSummary = ResumeNarrative & {
  credentialSubject?: ResumeNarrative
}

type ResumeEmployment = {
  id?: string
  title?: string
  organization?: string | { tradeName?: string }
  startDate?: string
  endDate?: string
  stillEmployed?: boolean
  duration?: string
  description?: string
}

type ResumeEducation = {
  id?: string
  degree?: string
  fieldOfStudy?: string
  institution?: string
  duration?: string
}

type ResumeSkill = { name?: string }

type ResumeProject = {
  id?: string
  name?: string
  title?: string
  description?: string
}

type ResumeCertification = {
  id?: string
  name?: string
  issuer?: string
  date?: string
}

type ResumeAffiliation = {
  id?: string
  name?: string
  organization?: string
  duration?: string
}

type ResumeVc = {
  credentialSubject?: {
    type?: string | string[]
    person?: {
      name?: { formattedName?: string; name?: string } | string
      primaryLanguage?: string
      contact?: {
        fullName?: string
        email?: string
        phone?: string
        location?: {
          street?: string
          city?: string
          state?: string
          country?: string
          postalCode?: string
        }
        socialLinks?: {
          linkedin?: string
          github?: string
          portfolio?: string
          twitter?: string
        }
      }
    }
    professionalSummary?: ResumeProfessionalSummary
    employmentHistory?: ResumeEmployment[]
    educationAndLearning?: ResumeEducation[]
    skills?: ResumeSkill[]
    certifications?: ResumeCertification[]
    projects?: ResumeProject[]
    professionalAffiliations?: ResumeAffiliation[]
  }
}

function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export default function ResumePreviewScreen({
  navigation,
  route
}: ResumePreviewScreenProps): React.ReactElement {
  const { styles } = useDynamicStyles(dynamicStyleSheet)
  const { rawCredentialRecord } = route.params
  const verifyPayload = useVerifyCredential(rawCredentialRecord, false)

  const vc = rawCredentialRecord.credential as unknown as ResumeVc
  const resume = vc?.credentialSubject

  const contact = resume?.person?.contact
  const location = contact?.location

  const name = useMemo(() => {
    const contactName = contact?.fullName?.trim()
    if (contactName) return contactName

    const n = resume?.person?.name
    if (typeof n === 'string') return n
    const formatted = n?.formattedName?.trim()
    if (formatted) return formatted
    const fallback = n?.name?.trim()
    if (fallback) return fallback
    return 'Resume'
  }, [contact?.fullName, resume?.person?.name])

  const locationText = useMemo(() => {
    const country = String(location?.country ?? '').trim()
    const city = String(location?.city ?? '').trim()
    const state = String(location?.state ?? '').trim()
    const parts = [country, city || state].filter((p) => p.length > 0)
    return parts.join(', ')
  }, [location?.country, location?.city, location?.state])

  const verified =
    verifyPayload?.loading === false
      ? Boolean(verifyPayload.result.verified)
      : null

  const statusLabel =
    verified === null ? 'Checking' : verified ? 'Verified' : 'Unverified'

  const email = String(contact?.email ?? '').trim()
  const social = contact?.socialLinks ?? {}
  const linkedin = String(social?.linkedin ?? '').trim()
  const github = String(social?.github ?? '').trim()
  const portfolio = String(social?.portfolio ?? '').trim()

  const summaryText = useMemo(() => {
    const narrative =
      resume?.professionalSummary?.credentialSubject?.narrative ??
      resume?.professionalSummary?.credentialSubject?.text ??
      resume?.professionalSummary?.text ??
      resume?.professionalSummary?.narrative
    if (typeof narrative === 'string' && narrative.trim()) {
      return stripHtml(narrative.trim())
    }
    return ''
  }, [resume?.professionalSummary])

  const employmentHistory = useMemo(
    () => resume?.employmentHistory ?? [],
    [resume?.employmentHistory]
  )
  const education = useMemo(
    () => resume?.educationAndLearning ?? [],
    [resume?.educationAndLearning]
  )
  const skills = useMemo(() => resume?.skills ?? [], [resume?.skills])
  const projects = useMemo(() => resume?.projects ?? [], [resume?.projects])
  const certifications = useMemo(
    () => resume?.certifications ?? [],
    [resume?.certifications]
  )
  const affiliations = useMemo(
    () => resume?.professionalAffiliations ?? [],
    [resume?.professionalAffiliations]
  )

  const skillsLine = useMemo(() => {
    const names = skills
      .map((s) => String(s?.name ?? '').trim())
      .filter((s) => s.length > 0)
    return names.join('  •  ')
  }, [skills])

  const openUrl = async (url: string) => {
    if (!url) return
    try {
      await Linking.openURL(url)
    } catch {
      // ignore
    }
  }

  const openEmail = async () => {
    if (!email) return
    await openUrl(`mailto:${email}`)
  }

  function Section({
    title,
    children
  }: {
    title: string
    children: React.ReactNode
  }) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {children}
        <View style={styles.divider} />
      </View>
    )
  }

  return (
    <>
      <NavHeader title="Resume Preview" goBack={navigation.goBack} />
      <View style={styles.outerContainer}>
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.container}
        >
          <View style={styles.paper}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={styles.headerTopRow}>
                  <View style={styles.nameRow}>
                    <Text style={styles.nameText} numberOfLines={2}>
                      {name}
                    </Text>
                    {!!locationText && (
                      <Text style={styles.locationText} numberOfLines={1}>
                        {locationText}
                      </Text>
                    )}
                    <View style={styles.statusPill}>
                      <MaterialIcons
                        name={verified ? 'verified-user' : 'shield'}
                        size={16}
                        style={styles.statusIcon}
                        color={verified ? 'green' : undefined}
                      />
                      <Text style={styles.statusPillText}>{statusLabel}</Text>
                    </View>
                  </View>
                </View>

                {(!!email || !!linkedin || !!github || !!portfolio) && (
                  <View style={styles.contactBlock}>
                    {!!email && (
                      <Text style={styles.contactLink} onPress={openEmail}>
                        {email}
                      </Text>
                    )}

                    {(!!linkedin || !!github || !!portfolio) && (
                      <View style={styles.socialRow}>
                        {!!linkedin && (
                          <>
                            <MaterialIcons
                              name="business"
                              size={18}
                              style={styles.socialIcon}
                              color={undefined}
                            />
                            <Text
                              style={styles.contactLink}
                              onPress={() => openUrl(linkedin)}
                            >
                              {linkedin}
                            </Text>
                          </>
                        )}

                        {!!linkedin && (!!github || !!portfolio) && (
                          <Text style={styles.socialSeparator}>|</Text>
                        )}

                        {!!github && (
                          <>
                            <MaterialIcons
                              name="code"
                              size={18}
                              style={styles.socialIcon}
                              color={undefined}
                            />
                            <Text
                              style={styles.contactLink}
                              onPress={() => openUrl(github)}
                            >
                              {github}
                            </Text>
                          </>
                        )}

                        {!!github && !!portfolio && (
                          <Text style={styles.socialSeparator}>|</Text>
                        )}

                        {!!portfolio && (
                          <>
                            <MaterialIcons
                              name="language"
                              size={18}
                              style={styles.socialIcon}
                              color={undefined}
                            />
                            <Text
                              style={styles.contactLink}
                              onPress={() => openUrl(portfolio)}
                            >
                              {portfolio}
                            </Text>
                          </>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>

            {!!summaryText && (
              <Section title="Professional Summary">
                <Text style={styles.bodyText}>{summaryText}</Text>
              </Section>
            )}

            {employmentHistory.length > 0 && (
              <Section title="Work Experience">
                {employmentHistory.map((job) => {
                  const role = String(job?.title ?? '').trim()
                  const orgRaw = job?.organization
                  const org = String(
                    (typeof orgRaw === 'object' ? orgRaw?.tradeName : orgRaw) ??
                      ''
                  ).trim()
                  const startDate = String(job?.startDate ?? '').trim()
                  const endDate = String(job?.endDate ?? '').trim()
                  const stillEmployed = Boolean(job?.stillEmployed)
                  const duration = String(job?.duration ?? '').trim()
                  const dateLine =
                    startDate || endDate || stillEmployed
                      ? `${startDate || ''}${startDate ? ' - ' : ''}${
                          stillEmployed ? 'Present' : endDate || ''
                        }`.trim()
                      : duration

                  const descRaw = String(job?.description ?? '').trim()
                  const desc = descRaw ? stripHtml(descRaw) : ''

                  return (
                    <View
                      key={String(job?.id ?? `${role}-${org}-${dateLine}`)}
                      style={styles.item}
                    >
                      <Text style={styles.itemTitle}>{role || 'Role'}</Text>
                      {!!org && <Text style={styles.itemSub}>{org}</Text>}
                      {!!dateLine && (
                        <Text style={styles.itemMeta}>{dateLine}</Text>
                      )}
                      {!!desc && (
                        <Text style={[styles.bodyText, { marginTop: 10 }]}>
                          {desc}
                        </Text>
                      )}
                    </View>
                  )
                })}
              </Section>
            )}

            {education.length > 0 && (
              <Section title="Education">
                {education.map((e) => {
                  const degree = String(e?.degree ?? '').trim()
                  const field = String(e?.fieldOfStudy ?? '').trim()
                  const institution = String(e?.institution ?? '').trim()
                  const duration = String(e?.duration ?? '').trim()
                  const titleLeft = [degree, field]
                    .filter((x) => x.length > 0)
                    .join(' in ')
                  const title = [titleLeft, institution]
                    .filter((x) => x.length > 0)
                    .join(', ')
                  return (
                    <View
                      key={String(e?.id ?? `${degree}-${institution}`)}
                      style={styles.item}
                    >
                      <Text style={styles.itemTitle}>
                        {title || 'Education'}
                      </Text>
                      {!!duration && (
                        <Text style={styles.itemMeta}>{duration}</Text>
                      )}
                    </View>
                  )
                })}
              </Section>
            )}

            {!!skillsLine && (
              <Section title="Skills">
                <Text style={styles.bodyText}>{skillsLine}</Text>
              </Section>
            )}

            {projects.length > 0 && (
              <Section title="Projects">
                {projects.map((p) => {
                  const pTitle = String(p?.name ?? p?.title ?? '').trim()
                  const pDesc = String(p?.description ?? '').trim()
                  return (
                    <View key={String(p?.id ?? pTitle)} style={styles.item}>
                      <Text style={styles.itemTitle}>
                        {pTitle || 'Project'}
                      </Text>
                      {!!pDesc && (
                        <Text style={[styles.bodyText, { marginTop: 10 }]}>
                          {stripHtml(pDesc)}
                        </Text>
                      )}
                    </View>
                  )
                })}
              </Section>
            )}

            {certifications.length > 0 && (
              <Section title="Certifications">
                {certifications.map((c) => {
                  const cName = String(c?.name ?? '').trim()
                  const issuer = String(c?.issuer ?? '').trim()
                  const date = String(c?.date ?? '').trim()
                  const line2 = [issuer, date ? date : 'No Expiration']
                    .filter((x) => x.length > 0)
                    .join(' • ')
                  return (
                    <View
                      key={String(c?.id ?? `${cName}-${issuer}`)}
                      style={styles.item}
                    >
                      <Text style={styles.itemTitle}>
                        {cName || 'Certification'}
                      </Text>
                      {!!line2 && <Text style={styles.itemSub}>{line2}</Text>}
                    </View>
                  )
                })}
              </Section>
            )}

            {affiliations.length > 0 && (
              <Section title="Professional Affiliations">
                {affiliations.map((a) => {
                  const aName = String(a?.name ?? '').trim()
                  const org = String(a?.organization ?? '').trim()
                  const duration = String(a?.duration ?? '').trim()
                  return (
                    <View
                      key={String(a?.id ?? `${aName}-${org}`)}
                      style={styles.item}
                    >
                      <Text style={styles.itemTitle}>
                        {aName || 'Affiliation'}
                      </Text>
                      {!!org && <Text style={styles.itemSub}>{org}</Text>}
                      {!!duration && (
                        <Text style={styles.itemMeta}>{duration}</Text>
                      )}
                    </View>
                  )
                })}
              </Section>
            )}

            <View style={styles.footerSpacer} />
          </View>
        </ScrollView>
      </View>
    </>
  )
}
