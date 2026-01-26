import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import { getAllReferrals, getAdminAnalytics, getAdminUsers, getAdminStudents, getAdminAdmins, getAdminCampusPerformance, getReferralStats } from '@/app/admin-actions'
import { getCampuses } from '@/app/campus-actions'
import { confirmReferral } from '@/app/admin-actions'
import { AdminClient } from './admin-client'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const dynamic = 'force-dynamic'

// Helper function to serialize dates in objects (Since we are passing to client component)
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

type SearchParams = Promise<{
    view?: string
    page?: string
    status?: string
    role?: string
    campus?: string
    search?: string
    from?: string
    to?: string
    // Add other filters as needed
    // Add other filters as needed
    feeType?: string
    grade?: string
}>

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('Campus'))) redirect('/dashboard')

    const params = await searchParams
    const view = params?.view || 'home'
    const page = parseInt(params.page || '1')

    // Parse Filters
    const filters = {
        status: params.status,
        role: params.role,
        campus: params.campus,
        search: params.search,
        feeType: params.feeType,
        grade: params.grade,
        dateRange: (params.from && params.to) ? { from: params.from, to: params.to } : undefined
    }

    // Conditional Data Fetching
    let referralsPromise: Promise<any> = Promise.resolve({ success: true, referrals: [], meta: { page: 1, limit: 50, total: 0, totalPages: 1 } })
    let analyticsPromise: Promise<any> = Promise.resolve({ success: true }) // Default empty success to avoid errors
    let campusesPromise: Promise<any> = Promise.resolve({ success: true, campuses: [] })
    let referralStatsPromise: Promise<any> = Promise.resolve({ success: true })
    let usersPromise: Promise<any> = Promise.resolve({ success: true, users: [] })
    let studentsPromise: Promise<any> = Promise.resolve({ success: true, students: [] })
    let adminsPromise: Promise<any> = Promise.resolve({ success: true, admins: [] })
    let campusPerformancePromise: Promise<any> = Promise.resolve({ success: true, campusPerformance: [] })

    // Determine what to fetch based on View
    if (view === 'home' || view === 'analytics' || view === 'reports') {
        analyticsPromise = getAdminAnalytics()
        // Home view might use referral stats too?
    }

    if (view === 'referrals') {
        referralsPromise = getAllReferrals(page, 50, filters)
        referralStatsPromise = getReferralStats(filters)
        campusesPromise = getCampuses()
    }

    if (view === 'users') {
        usersPromise = getAdminUsers()
        campusesPromise = getCampuses()
    }

    if (view === 'students') {
        studentsPromise = getAdminStudents()
        campusesPromise = getCampuses()
    }

    if (view === 'admins') {
        adminsPromise = getAdminAdmins()
        campusesPromise = getCampuses()
    }

    if (view === 'campuses') {
        campusPerformancePromise = getAdminCampusPerformance()
        campusesPromise = getCampuses()
    }

    // Execute necessary queries in parallel
    const [referrals, analytics, campusesResult, referralStats, users, students, admins, campusPerformance] = await Promise.all([
        referralsPromise,
        analyticsPromise,
        campusesPromise,
        referralStatsPromise,
        usersPromise,
        studentsPromise,
        adminsPromise,
        campusPerformancePromise
    ])

    const permissions = await import('@/lib/permission-service').then(m => m.getMyPermissions())

    // if (!analytics.success && (view === 'home' || view === 'analytics')) return <div>Error loading analytics</div>

    return (
        <ErrorBoundary>
            <AdminClient
                referrals={serializeData(referrals.success ? referrals.referrals : []) as any}
                referralMeta={referrals.success && referrals.meta ? referrals.meta : { page: 1, limit: 50, total: 0, totalPages: 1 }}
                referralStats={referralStats.success ? referralStats : undefined}
                analytics={analytics.success ? analytics : {} as any}
                confirmReferral={confirmReferral}
                initialView={view}
                campuses={(campusesResult.success ? campusesResult.campuses : []) as any}
                users={serializeData(users.success ? users.users : []) as any}
                students={serializeData(students.success ? students.students : []) as any}
                admins={serializeData(admins.success ? admins.admins : []) as any}
                campusPerformance={serializeData(campusPerformance.success ? campusPerformance.campusPerformance : []) as any}
                permissions={permissions || undefined}
            />
        </ErrorBoundary>
    )
}
