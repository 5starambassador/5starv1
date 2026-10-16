import { getCampusUsers } from '@/app/actions/campus-dashboard-actions'
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

export default async function CampusUsers({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; pageSize?: string }> }) {
    const params = await searchParams
    const query = params.q || ''
    const page = Number(params.page) || 1
    const pageSize = Number(params.pageSize) || 10

    const { success, data: users, pagination, error } = await getCampusUsers({ query, page, pageSize })

    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>
    }

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
                initialUsers={serializeData(users) || []} 
                query={query} 
                pagination={serializeData(pagination)}
            />
        </div>
    )
}
