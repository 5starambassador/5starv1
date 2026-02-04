
import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import { getAllStudents, getAllUsers } from '@/app/superadmin-actions'
import { getCampuses } from '@/app/campus-actions'
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

    // Parallel Fetching
    const [students, users, campusesData] = await Promise.all([
        getAllStudents(),
        getAllUsers(), // Needed for parent lookup in modals
        getCampuses()
    ])

    return (
        <ErrorBoundary>
            <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Student Database...</div>}>
                <StudentsPageClient
                    students={serializeData(students)}
                    users={serializeData(users)}
                    campuses={campusesData.campuses || []}
                />
            </Suspense>
        </ErrorBoundary>
    )
}
