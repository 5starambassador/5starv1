import { getCampusUsers } from '@/app/actions/campus-dashboard-actions'
import { CampusUsersClient } from './campus-users-client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CampusUsers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
    const params = await searchParams
    const query = params.q || ''
    const { success, data: users, error } = await getCampusUsers(query)

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

            <CampusUsersClient initialUsers={users || []} query={query} />
        </div>
    )
}
