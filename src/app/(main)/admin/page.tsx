import { getAllReferrals, getAdminAnalytics, confirmReferral } from '@/app/admin-actions'
import { getCampuses } from '@/app/campus-actions'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth-service'
import { AdminClient } from './admin-client'

// Helper function to serialize dates
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
    if (!user || !user.role.includes('Admin')) redirect('/dashboard')

    const params = await searchParams
    const view = params?.view || 'analytics'

    // Parallel data fetching
    const [referrals, analytics, campusesResult] = await Promise.all([
        getAllReferrals(),
        getAdminAnalytics(),
        getCampuses()
    ])

    if (!analytics) return <div>Error loading analytics</div>

    return (
        <AdminClient
            referrals={serializeData(referrals)}
            analytics={analytics}
            confirmReferral={confirmReferral}
            initialView={view}
            campuses={campusesResult.success ? campusesResult.campuses : []}
        />
    )
}
