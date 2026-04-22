import { Prisma, LeadStatus, AccountStatus } from '@prisma/client'
import { encryptReferralCode } from './crypto'

// Helper to ensure names are properly capitalized for 100% professional delivery
export const toTitleCase = (str: string) => {
    if (!str) return ''
    return str.toString().split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase())
        .join(' ')
}

/**
 * Common Logic for Audience Query Construction
 * Used by:
 * - campaign-actions.ts (Counting & Sending)
 * - campaign-dispatcher.ts (Batched Dispatch)
 *
 * DESIGN: Uses AND array so filters never clobber each other's OR/fields.
 * All new fields are optional and default to "All" behavior.
 */

export type AudienceFilter = {
    type?: 'AMBASSADORS' | 'PROGRAM_LEADS' | 'REFERRALS' | 'STUDENTS'
    role: string
    campus: string
    activityStatus: string // 'All' | 'Active' | 'Dormant'

    accountHealth?: string      // 'Active' | 'Inactive' | 'All'
    referralMilestone?: string  // '0' | '1' | '2' | '3' | '4' | '5+' | 'All'
    missingInfo?: string        // 'bankDetails' | 'childDetails' | 'None'
    leadFunnelStatus?: string   // 'hasPendingLeads' | 'hasVisitedLeads' | 'hasSubmittedNotConfirmed' | 'hasNoLeads' | 'All'
    leadStatus?: string         // 'New' | 'Contacted' | 'Admitted_Confirmed' | 'Rejected' | 'All'
    programLeadStatus?: string  // 'CLICKED' | 'REGISTERED' | 'All'
    programId?: string          // 'All' | Specific ID
}

export const getAmbassadorQuery = (audience: AudienceFilter): Prisma.UserWhereInput => {
    // Use AND array so filters never clobber each other's OR/field assignments
    const andClauses: Prisma.UserWhereInput[] = []

    // ── Account Health ─────────────────────────────────────────────────────────
    const health = audience.accountHealth || 'Active'
    if (health === 'Active') {
        andClauses.push({ status: AccountStatus.Active })
    } else if (health === 'Inactive') {
        andClauses.push({ status: { not: AccountStatus.Active } })
    }
    // 'All' = no filter

    // ── Role ───────────────────────────────────────────────────────────────────
    if (audience.role && audience.role !== 'All') {
        andClauses.push({ role: audience.role as any })
    }

    // ── Campus ─────────────────────────────────────────────────────────────────
    if (audience.campus && audience.campus !== 'All') {
        andClauses.push({ assignedCampus: audience.campus })
    }

    // ── Activity Status (14-day engagement check) ─────────────────────────────
    if (audience.activityStatus && audience.activityStatus !== 'All') {
        const fourteenDaysAgo = new Date()
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

        if (audience.activityStatus === 'Active') {
            andClauses.push({
                OR: [
                    { createdAt: { gte: fourteenDaysAgo } },
                    { referrals: { some: { createdAt: { gte: fourteenDaysAgo } } } }
                ]
            })
        } else if (audience.activityStatus === 'Dormant') {
            andClauses.push({ createdAt: { lt: fourteenDaysAgo } })
            andClauses.push({ referrals: { none: { createdAt: { gte: fourteenDaysAgo } } } })
        }
    }

    // ── Referral Milestones ────────────────────────────────────────────────────
    const milestone = audience.referralMilestone
    if (milestone && milestone !== 'All') {
        if (milestone === '0') {
            andClauses.push({ confirmedReferralCount: 0 })
        } else if (milestone === '1') {
            andClauses.push({ confirmedReferralCount: 1 })
        } else if (milestone === '2') {
            andClauses.push({ confirmedReferralCount: 2 })
        } else if (milestone === '3') {
            andClauses.push({ confirmedReferralCount: 3 })
        } else if (milestone === '4') {
            andClauses.push({ confirmedReferralCount: 4 })
        } else if (milestone === '5+') {
            andClauses.push({ confirmedReferralCount: { gte: 5 } })
        }
    }

    // ── Missing Info ───────────────────────────────────────────────────────────
    // UI sends 'None' as default (not undefined), so check both
    const missing = audience.missingInfo
    if (missing && missing !== 'None' && missing !== 'All') {
        if (missing === 'bankDetails') {
            andClauses.push({
                OR: [
                    { accountNumber: null },
                    { accountNumber: '' },
                    { ifscCode: null },
                    { ifscCode: '' }
                ]
            })
        } else if (missing === 'childDetails') {
            andClauses.push({ role: 'Parent' })
            andClauses.push({ students: { none: {} } })
        }
    }

    // ── Lead Funnel Status ─────────────────────────────────────────────────────
    const funnel = audience.leadFunnelStatus
    if (funnel && funnel !== 'All') {
        if (funnel === 'hasSubmittedNotConfirmed') {
            // Has referral leads but NONE confirmed/admitted → perfect for follow-up
            andClauses.push({
                referrals: {
                    some: {},
                    none: { leadStatus: { in: [LeadStatus.Confirmed, LeadStatus.Admitted] } }
                }
            })
        } else if (funnel === 'hasPendingLeads') {
            andClauses.push({
                referrals: {
                    some: {
                        leadStatus: { in: [LeadStatus.New, LeadStatus.Interested, LeadStatus.Follow_up, LeadStatus.Contacted] }
                    }
                }
            })
        } else if (funnel === 'hasVisitedLeads') {
            andClauses.push({
                referrals: { some: { leadStatus: LeadStatus.Contacted } }
            })
        } else if (funnel === 'hasNoLeads') {
            andClauses.push({ referrals: { none: {} } })
        }
    }

    return andClauses.length > 0 ? { AND: andClauses } : {}
}

export const getStudentQuery = (audience: AudienceFilter): Prisma.StudentWhereInput => {
    const where: Prisma.StudentWhereInput = {
        status: 'Active',
        referralLeadId: { not: null } // Only referral-converted students (not ERP imports)
    }
    if (audience.campus && audience.campus !== 'All') {
        where.campus = { campusName: audience.campus }
    }
    return where
}

export const getReferralQuery = (audience: AudienceFilter): Prisma.ReferralLeadWhereInput => {
    const andClauses: Prisma.ReferralLeadWhereInput[] = []

    // ── Campus ─────────────────────────────────────────────────────────────────
    if (audience.campus && audience.campus !== 'All') {
        andClauses.push({ campus: audience.campus })
    }

    // ── Lead Status (Referral Stage) ───────────────────────────────────────────
    const status = audience.leadStatus
    if (status && status !== 'All') {
        if (status === 'Admitted_Confirmed') {
            andClauses.push({ leadStatus: { in: [LeadStatus.Admitted, LeadStatus.Confirmed] } })
        } else if (status === 'Contacted') {
            andClauses.push({ leadStatus: { in: [LeadStatus.Contacted, LeadStatus.Follow_up, LeadStatus.Interested] } })
        } else if (status === 'New') {
            andClauses.push({ leadStatus: LeadStatus.New })
        } else if (status === 'Rejected') {
            andClauses.push({ leadStatus: LeadStatus.Rejected })
        }
    }

    return andClauses.length > 0 ? { AND: andClauses } : {}
}

export const getProgramLeadQuery = (audience: AudienceFilter): Prisma.ProgramLeadWhereInput => {
    const andClauses: Prisma.ProgramLeadWhereInput[] = []

    // ── Campus (via Referrer) ──────────────────────────────────────────────────
    if (audience.campus && audience.campus !== 'All') {
        andClauses.push({ referrer: { assignedCampus: audience.campus } })
    }

    // ── Status (Stage) ────────────────────────────────────────────────────────
    const status = audience.programLeadStatus
    if (status && status !== 'All') {
        if (status === 'CLICKED') {
            andClauses.push({ status: 'CLICKED' })
        } else if (status === 'REGISTERED') {
            andClauses.push({ status: 'REGISTERED' })
        }
    }

    // ── Program Filter ────────────────────────────────────────────────────────
    if (audience.programId && audience.programId !== 'All') {
        andClauses.push({ programId: Number(audience.programId) })
    }

    return andClauses.length > 0 ? { AND: andClauses } : {}
}

/**
 * 🚀 SENIOR EXPERT RESOLVER: The "Central Brain" for all WhatsApp Variables
 * Standardizes:
 * 1. TitleCase for all names
 * 2. {ReferralLink} vs {ProgramLink} parity
 * 3. Fallback resilience for missing data
 */
export const aliasTokens = async (text: string, user: any, audienceType: string = 'AMBASSADORS') => {
    if (!text) return ''
    const type = audienceType || 'AMBASSADORS'
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.5starambassador.com'
    // RESOLVER v6 - forced recompile stamp

    // ✅ BARE-KEY RESILIENCE: If the UI sends "Name" instead of "{Name}", wrap it
    let workingText = text
    const bareKeys = ['Name', 'leadName', 'userName', 'studentName', 'source', 'ambassadorName', 'programLink', 'programName', 'campus', 'referralCode', 'referralLink', 'referrerLink', 'role', 'status', 'enquiryDate', 'academicYear']
    if (!text.includes('{') && bareKeys.some(bk => text.toLowerCase() === bk.toLowerCase())) {
        workingText = `{${text}}`
    }

    const referralCode = user.referralCode || user.referrerCode || ''
    const referralLink = referralCode ? `${baseUrl}/r/${encryptReferralCode(referralCode)}` : ''
    const referrerLink = user.referrerCode ? `${baseUrl}/r/${encryptReferralCode(user.referrerCode)}` : ''

    let resolvedText = workingText
    const traceId = Math.random().toString(36).substring(7)
    // @ts-ignore - DEBUG LOGGING
    if (typeof window === 'undefined') console.error(`[RESOLVER_CRITICAL_TRACE:${traceId}] Mapping: "${text}" | Recipient: ${user.fullName} | Role: ${type}`)

    // 1. DYNAMIC PROGRAM LINKS & AUTHORITATIVE FALLBACKS
    // We handle Program Links BEFORE any other replacements to ensure specific slugs (Picker selections)
    // take precedence over general defaults.
    
    // Pattern A: Manually picked program (e.g. {ProgramLink:wow-summer-camp})
    // Use simple string check — avoids any regex escaping issues
    if (resolvedText.includes('{ProgramLink:') || resolvedText.includes('{programLink:')) {
        const programRegex = /\{[Pp]rogram[Ll]ink:([^}]+)\}/g
        resolvedText = resolvedText.replace(programRegex, (match, slug) => {
            const activeRefCode = user.referralCode || user.referrerCode || ''
            const finalLink = activeRefCode
                ? `${baseUrl}/offer/${slug.trim()}?r=${encryptReferralCode(activeRefCode)}`
                : `${baseUrl}/offer/${slug.trim()}`
            // @ts-ignore
            if (typeof window === 'undefined') console.error(`[WHATSAPP_LINK_AUTHORITY] Picker LOCKED: ${slug} -> ${finalLink}`)
            return finalLink
        })
    }

    // Pattern B: Bare {ProgramLink} — ONLY runs if Pattern A did NOT already resolve it
    const hasBareToken = resolvedText.includes('{ProgramLink}') || resolvedText.includes('{programLink}')
    const hasPickerToken = resolvedText.includes('{ProgramLink:') || resolvedText.includes('{programLink:')
    if (hasBareToken && !hasPickerToken) {
        const activeRefCode = user.referralCode || user.referrerCode || ''
        let fallbackLink = ''

        if (type === 'REFERRALS' || type === 'PROGRAM_LEADS') {
            const pSlug = user.programSlug || user.slug || user.programInterested || user.programName || ''
            fallbackLink = pSlug
                ? `${baseUrl}/offer/${pSlug}${activeRefCode ? `?r=${encryptReferralCode(activeRefCode)}` : ''}`
                : (activeRefCode ? `${baseUrl}/p/admission?r=${encryptReferralCode(activeRefCode)}` : `${baseUrl}/p/admission`)
        } else {
            fallbackLink = activeRefCode ? `${baseUrl}/p/admission?r=${encryptReferralCode(activeRefCode)}` : `${baseUrl}/p/admission`
        }

        resolvedText = resolvedText.replace(/\{[Pp]rogram[Ll]ink\}/g, fallbackLink)
        // @ts-ignore
        if (typeof window === 'undefined') console.error(`[WHATSAPP_LINK_AUTHORITY] Bare fallback: ${fallbackLink}`)
    }

    // 2. AUDIENCE SPECIFIC MAPPING (Names, Stages, etc)
    if (type === 'STUDENTS') {
        resolvedText = resolvedText
            .replace(/{studentName}/gi, toTitleCase(user.studentName || 'Student'))
            .replace(/{grade}|{Grade}/gi, user.grade || 'Grade')
            .replace(/{admissionDate}/gi, user.admissionDate || 'Today')
    } else if (type === 'REFERRALS') {
        resolvedText = resolvedText
            .replace(/{studentName}/gi, toTitleCase(user.studentName || 'Student'))
            .replace(/{grade}|{Grade}/gi, user.grade || 'Grade')
            .replace(/{leadStatus}|{status}/gi, user.leadStatus || 'New')
            .replace(/{ambassadorName}|{referrerName}/gi, toTitleCase(user.ambassadorName || 'Achariya'))
            .replace(/{academicYear}/gi, user.academicYear || '2025-2026')
    } else if (type === 'PROGRAM_LEADS') {
        resolvedText = resolvedText
            .replace(/{studentName}/gi, toTitleCase(user.studentName || user.visitorName || 'Student'))
            .replace(/{source}|{referrerName}/gi, toTitleCase(user.source || 'Achariya Parent/Staff'))
            .replace(/{programName}/gi, user.programName || 'Program')
        resolvedText = resolvedText
            .replace(/{status}|{leadStatus}/gi, user.leadStatus || 'New')
            .replace(/{enquiryDate}/gi, user.enquiryDate || 'Recently')
    }
    
    // 3. FALLBACK GLOBAL MAPPING
    resolvedText = resolvedText
        .replace(/{userName}|{Ambassador}|{parentName}|{Name}|{leadName}/gi, toTitleCase(user.fullName || user.visitorName || 'Recipient'))
        .replace(/{studentName}/gi, toTitleCase(user.studentName || user.fullName || 'Student'))
        .replace(/{campus}|{Campus}|{CAMPUS}/gi, user.assignedCampus || 'Global Campus')
        .replace(/{mobile}|{Mobile}/gi, user.mobileNumber || user.visitorMobile || '')
        .replace(/{referralCode}|{code}|{ReferralCode}/gi, referralCode || 'ACH-REF')
        .replace(/{referralLink}|{ReferralLink}/gi, referralLink || baseUrl)
        .replace(/{referrerLink}|{ReferrerLink}/gi, referrerLink || baseUrl)
        .replace(/{role}|{Role}/gi, user.role || 'Ambassador')
        .replace(/{referralCount}/gi, (user.confirmedReferralCount || 0).toString())
        .replace(/{pendingReferrals}/gi, (user.pendingReferralCount || 0).toString())

    return resolvedText.trim()
}

/**
 * Higher-level function to resolve the standard variable array for WhatsApp
 */
export const resolveWhatsAppVariables = async (
    user: any,
    audienceType: string,
    mapping: Record<string, string>,
    requiredCount: number = 0
) => {
    const waVars: string[] = []
    const btnVars: string[] = []
    
    const mappingKeys = Object.keys(mapping).filter(k => {
        const cleanKey = k.replace('button_', 'var_')
        return !isNaN(Number(cleanKey.replace(/\D/g, '')))
    })
    
    const mappingMax = mappingKeys.length > 0 ? Math.max(...mappingKeys.map(k => Number(k.replace(/\D/g, '')))) : 0
    const varCount = requiredCount > 0 ? requiredCount : (mappingMax || 2)

    for (let i = 1; i <= varCount; i++) {
        const key = i.toString()
        const btnKey = `button_${i}`
        
        // 🔍 HIGH-RESILIENCE LOOKUP: Check every possible key naming convention
        const bodyMappedValue = mapping[key] || mapping[`var_${key}`] || mapping[`Variable ${key}`] || mapping[`variable_${key}`]
        let resolved = ''

        if (bodyMappedValue === 'STATIC') {
            resolved = (mapping[`static_${key}`] || mapping[`static_var_${key}`] || '').toString().replace(/[\r\n]+/g, ' ').trim() || 'Achariya'
        } else if (bodyMappedValue) {
            resolved = (await aliasTokens(bodyMappedValue, user, audienceType)).toString().replace(/[\r\n]+/g, ' ').trim()
            // @ts-ignore
            if (typeof window === 'undefined') console.error(`[RESULT_TRACE] Var ${i} -> "${resolved}"`)
        }

        // 🛡️ AUTHORITATIVE RECOVERY (Safety fallbacks for missing data)
        // If resolved is empty, dash, or generic fallback string, try to recover
        const genericValues = ['Recipient', 'Friend', 'Student', '-', '', 'null', 'undefined']
        if (!resolved || genericValues.includes(resolved)) {
            // 🛡️ PRIORITY PICKER LOCK: If it's a Program Link Picker, DO NOT use generic recovery
            // Recovery for Variable 3 should always prioritize maintaining the Picker slug
            if (bodyMappedValue?.includes('ProgramLink') || i === 3 || key === '3') {
                const recoveryKey = bodyMappedValue?.includes(':') ? bodyMappedValue : '{ProgramLink}'
                resolved = (await aliasTokens(recoveryKey, user, audienceType))
                // @ts-ignore
                if (typeof window === 'undefined') console.error(`[RECOVERY_SHIELD] Var 3 Locked to: ${resolved}`)
            } else if (i === 1) {
                resolved = toTitleCase(user.fullName || user.visitorName || 'Friend')
            } else if (i === 2) {
                // For Variable 2, prioritize Ambassador/Source, then Campus if all else fails
                resolved = toTitleCase(user.source || user.ambassadorName || user.assignedCampus || 'Achariya Ambassador')
            } else {
                resolved = resolved || '-' // Final fallback
            }
        }
        waVars.push(resolved)

        const btnMappedValue = mapping[btnKey]
        if (btnMappedValue === 'STATIC') {
            btnVars.push((mapping[`static_${btnKey}`] || '').toString().trim())
        } else if (btnMappedValue) {
            btnVars.push((await aliasTokens(btnMappedValue, user, audienceType)).toString().trim())
        }
    }

    return { waVars, btnVars }
}
