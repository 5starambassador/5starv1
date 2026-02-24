import { getCurrentUser } from '@/lib/auth-service'
import { hasPermission, getMyPermissions } from '@/lib/permission-service'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { isIpWhitelisted } from '@/lib/security'
import { getSystemAnalytics, getCampusComparison, getAllAdmins, getUserGrowthTrend, getAllStudents } from '@/app/superadmin-actions'
import { getAdminMarketingAssets } from '@/app/marketing-actions'
import { getSystemSettings, getSecuritySettings } from '@/app/settings-actions'
import SuperadminClient from './superadmin-client' // Client component
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Suspense } from 'react'

export const dynamic = 'force-dynamic'

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// Helper function to serialize dates in objects
function serializeData<T>(data: T): T {
    if (data === null || data === undefined) return data
    if (data instanceof Date) return data.toISOString() as unknown as T
    if (Array.isArray(data)) return data.map(item => serializeData(item)) as unknown as T
    if (typeof data === 'object') {
        const serialized: any = {}
        for (const key in data) {
            serialized[key] = serializeData((data as any)[key])
        }
        return serialized as T
    }
    return data
}

export default async function SuperadminPage({ searchParams }: PageProps) {
    const user = await getCurrentUser()
    const params = await searchParams

    if (!user) {
        redirect('/')
    }

    const permissions = await getMyPermissions()
    if (!permissions) redirect('/dashboard')

    // Allow access if they have access to ANY admin module
    const hasAdminAccess = Object.keys(permissions).some(key => {
        const p = (permissions as any)[key]
        return p && p.access === true && !['referralSubmission', 'referralTracking', 'savingsCalculator', 'rulesAccess', 'programLeads'].includes(key)
    })

    if (!hasAdminAccess) redirect('/dashboard')

    // --- SECURITY ENFORCEMENT: IP WHITELIST ---
    const securitySettings = await getSecuritySettings() as any
    if (securitySettings?.ipWhitelist) {
        const headersList = await headers()
        const clientIp = headersList.get('x-forwarded-for')?.split(',')[0] ||
            headersList.get('x-real-ip') ||
            'unknown'

        if (!isIpWhitelisted(clientIp, securitySettings.ipWhitelist as any)) {
            console.warn(`Unauthorized Super Admin access attempt from IP: ${clientIp}`)
            redirect('/unauthorized-ip')
        }
    }

    // --- SECURITY ENFORCEMENT: 2FA ---
    if (securitySettings?.twoFactorAuthEnabled) {
        const session = await getSession()
        if (!session || session.is2faVerified === false) {
            console.log(`2FA required for Super Admin: ${user.fullName}`)
            redirect('/auth/verify-2fa')
        }
    }

    // Helper for params
    const getString = (val: string | string[] | undefined) => Array.isArray(val) ? val[0] : val || undefined

    // Get view from URL params (default to 'home')
    const initialView = getString(params.view) || 'home'
    const initialReportMode = (getString(params.mode) || 'classic') as 'classic' | 'visual'
    const selectedYear = getString(params.year)
    const selectedSource = (getString(params.source) || 'referral') as 'referral' | 'all' | 'organic'

    // Default Empty Analytics Object
    const defaultAnalytics = {
        totalAmbassadors: 0,
        totalLeads: 0,
        totalConfirmed: 0,
        globalConversionRate: 0,
        totalCampuses: 0,
        systemWideBenefits: 0,
        totalStudents: 0,
        staffCount: 0,
        parentCount: 0,
        alumniCount: 0,
        othersCount: 0,
        userRoleDistribution: [],
        avgLeadsPerAmbassador: 0,
        totalEstimatedRevenue: 0,
        conversionFunnel: [],
        prevAmbassadors: 0,
        prevLeads: 0,
        prevConfirmed: 0,
        prevBenefits: 0
    }

    // Conditional Fetching
    let analyticsPromise: Promise<any> = Promise.resolve(defaultAnalytics)
    let campusComparisonPromise: Promise<any> = Promise.resolve([])
    let usersPromise: Promise<any> = Promise.resolve([])
    let adminsPromise: Promise<any> = Promise.resolve([])
    let studentsPromise: Promise<any> = Promise.resolve([])
    let marketingAssetsPromise: Promise<any> = Promise.resolve({ assets: [] })
    let growthTrendPromise: Promise<any> = Promise.resolve([])
    let deepTrendsPromise: Promise<any> = Promise.resolve({ success: true, trends: null })
    let referralDataPromise: Promise<any> = Promise.resolve({ referrals: [], meta: { page: 1, limit: 50, total: 0, totalPages: 1 } })
    let urgentTicketCountPromise: Promise<any> = Promise.resolve(0)
    let systemSettingsPromise: Promise<any> = Promise.resolve({})
    let campusesPromise: Promise<any> = Promise.resolve({ success: true, campuses: [] })

    // Common fetches
    const { getCampuses } = await import('@/app/campus-actions')
    campusesPromise = getCampuses()
    urgentTicketCountPromise = import('@/app/ticket-actions').then(m => m.getUrgentTicketCount())

    if (initialView === 'home' || initialView === 'analytics') {
        analyticsPromise = getSystemAnalytics('all', selectedYear, selectedSource)
        campusComparisonPromise = getCampusComparison('all', selectedYear, selectedSource)
        marketingAssetsPromise = getAdminMarketingAssets() // Maybe?
        growthTrendPromise = getUserGrowthTrend()
        deepTrendsPromise = import('@/app/analytics-trends-actions').then(m => m.getAnalyticsTrends())
        // Pre-fetch users for search? checking getAllUsers... it's heavy.
    }

    if (initialView === 'students') {
        studentsPromise = getAllStudents(selectedYear, selectedSource)
    }

    if (initialView === 'admins') {
        adminsPromise = getAllAdmins()
    }

    if (initialView === 'marketing') {
        marketingAssetsPromise = getAdminMarketingAssets()
    }

    if (initialView === 'settings') {
        systemSettingsPromise = getSystemSettings()
    }

    // Always fetch users if needed for search? 
    // Superadmin loads ALL users? getAllUsers() returns distinct fields.

    // Await all
    // Await all with explicit try-catch to prevent page crash
    let analytics = defaultAnalytics
    let campusComparison = []
    let users = []
    let admins = []
    let students = []
    let marketingAssets = { assets: [] }
    let growthTrend = []
    let deepTrends = { success: true, trends: null }
    let referralData = { referrals: [], meta: { page: 1, limit: 50, total: 0, totalPages: 1 } }
    let urgentTicketCount = 0
    let campusesResult = { success: true, campuses: [] }

    try {
        [analytics, campusComparison, users, admins, students, marketingAssets, growthTrend, deepTrends, referralData, urgentTicketCount, campusesResult] = await Promise.all([
            analyticsPromise.catch(e => { console.error('Analytics Fetch Error:', e); return defaultAnalytics }),
            campusComparisonPromise.catch(e => { console.error('Comp Fetch Error:', e); return [] }),
            usersPromise.catch(e => { console.error('Users Fetch Error:', e); return [] }),
            adminsPromise.catch(e => { console.error('Admins Fetch Error:', e); return [] }),
            studentsPromise.catch(e => { console.error('Students Fetch Error:', e); return [] }),
            marketingAssetsPromise.catch(e => { console.error('Marketing Fetch Error:', e); return { assets: [] } }),
            growthTrendPromise.catch(e => { console.error('Growth Fetch Error:', e); return [] }),
            deepTrendsPromise.catch(e => { console.error('Trends Fetch Error:', e); return { success: false } }),
            referralDataPromise.catch(e => { console.error('Referral Fetch Error:', e); return { referrals: [], meta: { page: 1, limit: 50, total: 0, totalPages: 1 } } }),
            urgentTicketCountPromise.catch(e => { console.error('Tickets Fetch Error:', e); return 0 }),
            campusesPromise.catch(e => { console.error('Campus Fetch Error:', e); return { success: false, campuses: [] } })
        ])
    } catch (error) {
        console.error('CRITICAL SUPERADMIN LOAD ERROR:', error)
        // Fallback to defaults (already set)
    }

    return (
        <ErrorBoundary>
            <Suspense fallback={
                <div className="flex h-screen items-center justify-center bg-slate-50">
                    <div className="flex flex-col items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
                            <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Initializing Control Hub...</p>
                    </div>
                </div>
            }>
                <SuperadminClient
                    analytics={analytics}
                    campusComparison={campusComparison}
                    users={serializeData(users) as any}
                    admins={serializeData(admins) as any}
                    students={serializeData(students) as any}
                    currentUser={serializeData(user) as any}
                    initialView={initialView}
                    initialReportMode={initialReportMode}
                    marketingAssets={serializeData(marketingAssets.assets || []) as any}
                    campuses={(campusesResult.success ? campusesResult.campuses : []) as any}

                    growthTrend={growthTrend}
                    deepTrends={deepTrends.success ? deepTrends : null}
                    urgentTicketCount={urgentTicketCount}

                    referrals={serializeData(referralData.referrals || [])}
                    referralMeta={referralData.meta || { page: 1, limit: 50, total: 0, totalPages: 1 }}
                    permissions={permissions}
                />
            </Suspense>
        </ErrorBoundary>
    )
}


