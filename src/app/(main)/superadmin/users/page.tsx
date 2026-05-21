
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth-service'
import { hasPermission } from '@/lib/permission-service'
import { redirect } from 'next/navigation'
import { getAllUsers } from '@/app/superadmin-actions'
import { getCampusNames } from '@/app/campus-actions'
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
    const page = Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1
    const pageSize = Number(Array.isArray(params.pageSize) ? params.pageSize[0] : params.pageSize) || 10
    const search = Array.isArray(params.search) ? params.search[0] : params.search
    const status = Array.isArray(params.status) ? params.status[0] : params.status
    const role = Array.isArray(params.role) ? params.role[0] : params.role
    const source = Array.isArray(params.source) ? params.source[0] : params.source
    const campusFilter = Array.isArray(params.campus) ? params.campus[0] : params.campus
    const referrals = Array.isArray(params.referrals) ? params.referrals[0] : params.referrals

    // Parallel Fetching: Using lightweight getCampusNames and getAllUsers together
    const [campusesResponse, usersResponse] = await Promise.all([
        getCampusNames(),
        getAllUsers({
            academicYear: year as string,
            page,
            pageSize,
            search: search as string,
            status: status as string,
            role: role as string,
            source: source as string,
            campusFilter: campusFilter as string,
            referrals: referrals as string
        })
    ])
    
    const campuses = campusesResponse.success ? campusesResponse.campuses || [] : []

    const { users, pagination } = typeof usersResponse === 'object' && 'users' in usersResponse
        ? usersResponse
        : { users: usersResponse, pagination: null }

    return (
        <ErrorBoundary>
            <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading User Database...</div>}>
                <UsersPageClient
                    users={serializeData(users) as any}
                    pagination={serializeData(pagination)}
                    campuses={serializeData(campuses) as any}
                    currentUserRole={user?.role || 'Campus Admin'}
                />
            </Suspense>
        </ErrorBoundary>
    )
}
