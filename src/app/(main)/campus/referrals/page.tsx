import { getAllReferrals } from '@/app/admin-actions'
import { getCampuses } from '@/app/campus-actions'
import { CampusLeadsClient } from './campus-leads-client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { AcademicYearFilter } from '@/components/AcademicYearFilter'

export const dynamic = 'force-dynamic'

interface PageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function CampusReferrals({ searchParams }: PageProps) {
    const params = await searchParams

    // Helper for params
    const getString = (val: string | string[] | undefined) => Array.isArray(val) ? val[0] : val || undefined

    const page = Number(getString(params.page)) || 1
    const limit = Number(getString(params.limit)) || 50
    const search = getString(params.search)
    const status = getString(params.status)
    const role = getString(params.role)
    const campus = getString(params.campus)
    const feeType = getString(params.feeType)
    const grade = getString(params.grade)
    const year = getString(params.year)

    const from = getString(params.from)
    const to = getString(params.to)
    const dateRange = (from && to) ? { from, to } : undefined

    // Parallel fetch for referrals and campuses
    const [res, campusRes] = await Promise.all([
        getAllReferrals(page, limit, {
            search,
            status,
            role,
            campus,
            feeType,
            grade,
            academicYear: year,
            dateRange
        }),
        getCampuses()
    ])

    if (!res.success) {
        return <div className="p-8 text-center text-red-500">{res.error || 'Failed to fetch referrals'}</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <Link href="/campus" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium mb-2">
                        <ArrowLeft size={16} /> Back to Home
                    </Link>

                    <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary-maroon to-primary-gold uppercase tracking-tight">
                        Campus Leads & Referrals
                    </h1>
                </div>
                <AcademicYearFilter />
            </div>

            <CampusLeadsClient
                referrals={res.referrals || []}
                meta={res.meta}
                isReadOnly={res.isReadOnly}
                campuses={campusRes.success ? (campusRes as any).campuses : []}
            />
        </div>
    )
}
