import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import { getAllReferrals, getAdminAnalytics, getAdminUsers, getAdminStudents, getAdminAdmins, getAdminCampusPerformance } from '@/app/admin-actions'
import { getCampuses } from '@/app/campus-actions'
import { confirmReferral } from '@/app/admin-actions'
import { AdminClient } from './admin-client'
import { ErrorBoundary } from '@/components/ErrorBoundary'

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

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Admin') && !user.role.includes('Campus'))) redirect('/dashboard')

    const params = await searchParams
    const view = params?.view || 'home'

    // Parallel data fetching
    const [referrals, analytics, campusesResult] = await Promise.all([
        getAllReferrals(),
        getAdminAnalytics(),
        getCampuses()
    ])

    // Conditional fetching for heavier views
    let users: any[] = []
    let students: any[] = []
    let admins: any[] = []
    let campusPerformance: any[] = []

    if (view === 'users') {
        const res = await getAdminUsers()
        if (res.success && res.users) users = res.users || []
    }

    if (view === 'students') {
        const res = await getAdminStudents()
        if (res.success && res.students) students = res.students || []
    }

    if (view === 'admins') {
        const res = await getAdminAdmins()
        if (res.success && res.admins) admins = res.admins || []
    }

    // Always fetch campus performance if view is campuses, or maybe pre-fetch? 
    // The user wants "Campus Performance" -> assume view='campuses'
    if (view === 'campuses') {
        const res = await getAdminCampusPerformance()
        if (res.success && res.campusPerformance) campusPerformance = res.campusPerformance || []
    }

    const permissions = await import('@/lib/permission-service').then(m => m.getMyPermissions())

    if (!analytics.success) return <div>Error loading analytics</div>

    return (
        <ErrorBoundary>
            <AdminClient
                referrals={serializeData(referrals.success ? referrals.referrals : []) || []}
                analytics={analytics.success ? analytics : {} as any}
                confirmReferral={confirmReferral}
                initialView={view}
                campuses={campusesResult.success ? campusesResult.campuses : []}
                users={serializeData(users) || []}
                students={serializeData(students) || []}
                admins={serializeData(admins) || []}
                campusPerformance={serializeData(campusPerformance) || []}
                permissions={permissions || undefined}
            />
        </ErrorBoundary>
    )
}
