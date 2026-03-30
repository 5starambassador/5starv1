import { Suspense } from 'react'
import { getCurrentUser } from '@/lib/auth-service'
import { hasPermission } from '@/lib/permission-service'
import { redirect } from 'next/navigation'
import { getAllReferrals } from '@/app/admin-actions'
import { getCampuses } from '@/app/campus-actions'
import ReferralsPageClient from './referrals-page-client'
import { ErrorBoundary } from '@/components/ErrorBoundary'

export const dynamic = 'force-dynamic'

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function SuperAdminReferralsPage({ searchParams }: PageProps) {
    const user = await getCurrentUser()
    const params = await searchParams

    if (!user) redirect('/')
    
    // 100% DB-Driven Permission Check
    const hasPipelineAccess = await hasPermission('referralTracking')
    const isAdmin = user.role.includes('Admin') || user.role === 'Campus Head'
    
    if (!hasPipelineAccess || !isAdmin) {
        redirect('/dashboard')
    }

    const page = parseInt(Array.isArray(params.page) ? params.page[0] : params.page || '1')
    const limit = parseInt(Array.isArray(params.limit) ? params.limit[0] : params.limit || '50')

    // Parse filters
    const filters = {
        status: Array.isArray(params.status) ? params.status[0] : params.status,
        role: Array.isArray(params.role) ? params.role[0] : params.role,
        campus: Array.isArray(params.campus) ? params.campus[0] : params.campus,
        search: Array.isArray(params.search) ? params.search[0] : params.search,
        academicYear: Array.isArray(params.year) ? params.year[0] : params.year,
        dateRange: (params.from && params.to) ? {
            from: Array.isArray(params.from) ? params.from[0] : params.from,
            to: Array.isArray(params.to) ? params.to[0] : params.to
        } : undefined
    }

    // Parallel Fetching
    const [referralData, campusesData] = await Promise.all([
        getAllReferrals(page, limit, filters),
        getCampuses()
    ])

    return (
        <ErrorBoundary>
            <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Referrals...</div>}>
                <ReferralsPageClient
                    referrals={referralData?.referrals || []}
                    meta={referralData?.meta}
                    campuses={campusesData.campuses || []}
                    userRole={user.role}
                />
            </Suspense>
        </ErrorBoundary>
    )
}
