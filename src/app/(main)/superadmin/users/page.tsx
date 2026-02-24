
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth-service'
import { hasPermission } from '@/lib/permission-service'
import { redirect } from 'next/navigation'
import { getAllUsers } from '@/app/superadmin-actions'
import { getCampuses } from '@/app/campus-actions'
import UsersPageClient from './users-page-client'
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

export default async function SuperAdminUsersPage({ searchParams }: PageProps) {
    const user = await getCurrentUser()
    const params = await searchParams

    if (!user) redirect('/')

    // RBAC: Dynamic permission check
    if (!await hasPermission('userManagement')) {
        redirect('/dashboard')
    }
    const year = Array.isArray(params.year) ? params.year[0] : params.year

    // Parallel Fetching
    const [users, campusesData] = await Promise.all([
        getAllUsers(year),
        getCampuses()
    ])

    return (
        <ErrorBoundary>
            <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading User Database...</div>}>
                <UsersPageClient
                    users={serializeData(users) as any}
                    campuses={serializeData(campusesData.campuses || []) as any}
                    currentUserRole={user?.role || 'Campus Admin'}
                />
            </Suspense>
        </ErrorBoundary>
    )
}
