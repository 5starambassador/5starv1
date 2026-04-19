
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import { getAllStudents, getAllUsers } from '@/app/superadmin-actions'
import { getCampuses } from '@/app/campus-actions'
import { getFeeStructure } from '@/app/fee-actions'
import StudentsPageClient from './students-page-client'
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

export default async function SuperAdminStudentsPage({ searchParams }: PageProps) {
    const user = await getCurrentUser()
    const params = await searchParams

    if (!user) redirect('/')
    if (user.role !== 'Super Admin') redirect('/dashboard')

    const year = Array.isArray(params.year) ? params.year[0] : params.year
    const yearString = (Array.isArray(year) ? year[0] : year) || '2025-2026'
    const source = (Array.isArray(params.source) ? params.source[0] : params.source || 'referral') as 'referral' | 'all' | 'organic'

    // Parallel Fetching
    const [students, usersResult, campusesData, feeData] = await Promise.all([
        getAllStudents(year, source),
        getAllUsers({ academicYear: year }), // Needed for parent lookup in modals
        getCampuses(),
        getFeeStructure({ academicYear: yearString })
    ])

    const users = Array.isArray(usersResult) ? usersResult : usersResult.users
    const gradeFees = feeData.success && feeData.data ? feeData.data : []

    return (
        <ErrorBoundary>
            <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Student Database...</div>}>
                <StudentsPageClient
                    students={serializeData(students)}
                    users={serializeData(users)}
                    campuses={campusesData.campuses || []}
                    gradeFees={serializeData(gradeFees) || []}
                />
            </Suspense>
        </ErrorBoundary>
    )
}
