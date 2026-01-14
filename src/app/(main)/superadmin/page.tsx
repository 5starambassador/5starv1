import { getCurrentUser } from '@/lib/auth-service'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { isIpWhitelisted } from '@/lib/security'
import { getSystemAnalytics, getCampusComparison, getAllUsers, getAllAdmins, getAllStudents, getUserGrowthTrend } from '@/app/superadmin-actions'
import { getAllReferrals } from '@/app/admin-actions' // Added import
import { getAdminMarketingAssets } from '@/app/marketing-actions'
import { getSystemSettings, getSecuritySettings } from '@/app/settings-actions'
import SuperadminClient from './superadmin-client' // Client component
import { ErrorBoundary } from '@/components/ErrorBoundary'

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

    // Check if user is Super Admin (strict check)
    if (user.role !== 'Super Admin') {
        redirect('/dashboard')
    }

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
        analyticsPromise = getSystemAnalytics()
        campusComparisonPromise = getCampusComparison()
        marketingAssetsPromise = getAdminMarketingAssets() // Maybe?
        growthTrendPromise = getUserGrowthTrend()
        deepTrendsPromise = import('@/app/analytics-trends-actions').then(m => m.getAnalyticsTrends())
        // Pre-fetch users for search? checking getAllUsers... it's heavy.
    }

    if (initialView === 'users') {
        usersPromise = getAllUsers()
    }

    if (initialView === 'admins') {
        adminsPromise = getAllAdmins()
    }

    if (initialView === 'students') {
        studentsPromise = getAllStudents()
        usersPromise = getAllUsers() // Needed for parent/ambassador lookup?
    }

    if (initialView === 'referrals') {
        const page = parseInt(getString(params.page) || '1')
        const limit = parseInt(getString(params.limit) || '50')
        const filters = {
            status: getString(params.status),
            role: getString(params.role),
            campus: getString(params.campus),
            search: getString(params.search),
            dateRange: (params.from && params.to) ? { from: getString(params.from)!, to: getString(params.to)! } : undefined
        }
        referralDataPromise = getAllReferrals(page, limit, filters)
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
    const [analytics, campusComparison, users, admins, students, marketingAssets, growthTrend, deepTrends, referralData, urgentTicketCount, campusesResult] = await Promise.all([
        analyticsPromise,
        campusComparisonPromise,
        usersPromise,
        adminsPromise,
        studentsPromise,
        marketingAssetsPromise,
        growthTrendPromise,
        deepTrendsPromise,
        referralDataPromise,
        urgentTicketCountPromise,
        campusesPromise
    ])

    return (
        <ErrorBoundary>
            <SuperadminClient
                analytics={analytics}
                campusComparison={campusComparison}
                users={serializeData(users) as any}
                admins={serializeData(admins) as any}
                students={serializeData(students) as any}
                currentUser={serializeData(user) as any}
                initialView={initialView}
                marketingAssets={serializeData(marketingAssets.assets || []) as any}
                campuses={(campusesResult.success ? campusesResult.campuses : []) as any}

                growthTrend={growthTrend}
                deepTrends={deepTrends.success ? deepTrends : null}
                urgentTicketCount={urgentTicketCount}

                // Referral Props
                referrals={serializeData(referralData.referrals || [])}
                referralMeta={referralData.meta || { page: 1, limit: 50, total: 0, totalPages: 1 }}
            />
        </ErrorBoundary>
    )
}


