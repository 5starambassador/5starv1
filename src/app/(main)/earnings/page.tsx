import { getMyEarningsStats } from '@/app/earnings-actions'
import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import { EarningsClient } from './EarningsClient'

export const metadata = {
    title: 'My Earnings | Achariya Ambassador',
    description: 'Track your referral earnings and settlement history'
}

import prisma from '@/lib/prisma'

export default async function EarningsPage({
    searchParams
}: {
    searchParams: Promise<{ year?: string }>
}) {
    const user = await getCurrentUser()
    if (!user) redirect('/')

    const { year } = await searchParams

    // Determine selected year: provided param OR current academic year
    let selectedYear = year
    if (!selectedYear) {
        const currentYearRecord = await prisma.academicYear.findFirst({
            where: { isCurrent: true }
        })
        selectedYear = currentYearRecord?.year || '2026-2027'
    }

    const [result, activeYears] = await Promise.all([
        getMyEarningsStats(year), // Pass the raw param (actions handle 'All Time' or specific year)
        prisma.academicYear.findMany({
            where: { isActive: true },
            orderBy: { startDate: 'desc' }
        })
    ])

    if (!result.success) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] text-white">
                <div className="text-center p-8 bg-white/5 rounded-3xl border border-white/10">
                    <h2 className="text-xl font-bold mb-2">Failed to load earnings</h2>
                    <p className="text-white/40">{result.error}</p>
                </div>
            </div>
        )
    }

    return (
        <EarningsClient
            stats={result.data}
            user={user}
            activeYears={activeYears}
            selectedYear={selectedYear}
        />
    )
}
