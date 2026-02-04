
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import { getCampuses } from '@/app/campus-actions'
import { getCampusComparison } from '@/app/superadmin-actions'
import CampusesPageClient from './campuses-page-client'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const dynamic = 'force-dynamic'

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

// Helper to serialize dates in objects
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

export default async function SuperAdminCampusesPage({ searchParams }: PageProps) {
    const user = await getCurrentUser()
    const params = await searchParams

    if (!user) redirect('/')
    if (user.role !== 'Super Admin') redirect('/dashboard')

    // Parallel Fetching
    const [campusesRes, campusComparison] = await Promise.all([
        getCampuses(),
        getCampusComparison('all')
    ])

    return (
        <ErrorBoundary>
            <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Campus Network...</div>}>
                <CampusesPageClient
                    campuses={campusesRes.campuses || []}
                    campusComparison={serializeData(campusComparison)}
                    mode="management"
                />
            </Suspense>
        </ErrorBoundary>
    )
}
