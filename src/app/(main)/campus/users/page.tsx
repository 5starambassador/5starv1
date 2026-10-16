import { getCampusUsers } from '@/app/actions/campus-dashboard-actions'
import { getCampuses } from '@/app/campus-actions'
import { CampusUsersClient } from './campus-users-client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

// Helper to safely serialize Dates and complex objects for Client Components
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

export default async function CampusUsers({ searchParams }: { 
    searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
    const params = await searchParams
    const getString = (val: string | string[] | undefined) => Array.isArray(val) ? val[0] : val || undefined

    const query = getString(params.q) || ''
    const page = Number(getString(params.page)) || 1
    const pageSize = Number(getString(params.pageSize)) || 10
    const status = getString(params.status)
    const role = getString(params.role)
    const source = getString(params.source)
    const campus = getString(params.campus)
    const referrals = getString(params.referrals)
    const year = getString(params.year)

    const [usersRes, campusRes] = await Promise.all([
        getCampusUsers({ 
            query, 
            page, 
            pageSize,
            status,
            role,
            source,
            campusFilter: campus,
            referrals,
            academicYear: year
        }),
        getCampuses()
    ])

    if (usersRes.error) {
        return <div className="p-8 text-center text-red-500">{usersRes.error}</div>
    }

    const campuses = (campusRes.campuses || []).map(c => ({ id: c.id, campusName: c.campusName }))

    return (
        <div className="space-y-6">
            {/* Back Link */}
            <Link href="/campus" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
                <ArrowLeft size={16} /> Back to Home
            </Link>

            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-maroon to-primary-gold">
                User Management
            </h1>

            <CampusUsersClient 
                initialUsers={serializeData(usersRes.data) || []} 
                query={query} 
                pagination={serializeData(usersRes.pagination)}
                campuses={campuses}
            />
        </div>
    )
}

