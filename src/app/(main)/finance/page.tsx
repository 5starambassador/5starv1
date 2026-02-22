import { getCurrentUser } from '@/lib/auth-service'
import { hasPermission } from '@/lib/permission-service'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'

import { getSettlements, getFinanceStats, getRegistrationTransactions, getUsersReadyForRefund, getAccruedPayoutLiabilities } from '@/app/finance-actions'
import { Wallet, CheckCircle, Clock, CreditCard } from 'lucide-react'
import { FinanceClientTabs } from '@/components/finance/FinanceClientTabs'

export default async function FinancePage({
    searchParams
}: {
    searchParams: Promise<{ year?: string }>
}) {
    const user = await getCurrentUser()
    if (!user) redirect('/')

    const { year } = await searchParams
    let selectedYear = year

    if (!selectedYear) {
        const currentYearRecord = await prisma.academicYear.findFirst({
            where: { isCurrent: true }
        })
        selectedYear = currentYearRecord?.year || '2026-2027'
    }

    // RBAC: Only roles with Finance & Settlements access
    if (!await hasPermission('settlements')) {
        redirect('/dashboard')
    }

    // Fetch Data
    const [settlementsRes, statsRes, registrationsRes, readyForRefundRes, liabilitiesRes, academicYears] = await Promise.all([
        getSettlements('All', selectedYear),
        getFinanceStats(selectedYear),
        getRegistrationTransactions('All', selectedYear),
        getUsersReadyForRefund(selectedYear),
        getAccruedPayoutLiabilities(selectedYear),
        prisma.academicYear.findMany({
            orderBy: { year: 'desc' }
        })
    ])

    const settlements = (settlementsRes.success && settlementsRes.data) ? settlementsRes.data : []
    const registrations = (registrationsRes.success && registrationsRes.data) ? registrationsRes.data : []
    const eligibleRefunds = (readyForRefundRes.success && readyForRefundRes.data) ? readyForRefundRes.data : []
    const liabilities = (liabilitiesRes.success && liabilitiesRes.data) ? liabilitiesRes.data : []
    const years = academicYears.map(y => y.year)
    const stats: any = statsRes.success ? statsRes.stats : { pending: 0, processed: 0, totalCount: 0, totalRevenue: 0 }

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* ... existing header and stats ... */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl shadow-sm border border-emerald-100">
                        <Wallet size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Finance & Settlements</h1>
                        <p className="text-sm text-gray-500 font-bold tracking-wide">Manage ambassador commissions and payouts</p>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider">Total Revenue</h3>
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                            <CreditCard size={24} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-black text-gray-900">₹{(stats.totalRevenue || 0).toLocaleString()}</h2>
                    </div>
                    <p className="text-xs text-emerald-600 font-bold mt-2 uppercase tracking-wide">Incoming Fees</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider">Pending Payouts</h3>
                        <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                            <Clock size={24} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-black text-gray-900">₹{stats?.pending?.toLocaleString() ?? 0}</h2>
                    </div>
                    <p className="text-xs text-amber-600 font-bold mt-2 uppercase tracking-wide">Requires Action</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider">Processed (Total)</h3>
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                            <CheckCircle size={24} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-black text-gray-900">₹{stats?.processed?.toLocaleString() ?? 0}</h2>
                    </div>
                    <p className="text-xs text-blue-600 font-bold mt-2 uppercase tracking-wide">Lifetime Disbursed</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider">Transactions</h3>
                        <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                            <Wallet size={24} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-black text-gray-900">{stats?.totalCount ?? 0}</h2>
                    </div>
                    <p className="text-xs text-purple-600 font-bold mt-2 uppercase tracking-wide">Total Volume</p>
                </div>
            </div>

            {/* Client Tabs Section */}
            <FinanceClientTabs
                settlements={settlements}
                registrations={registrations}
                eligibleRefunds={eligibleRefunds}
                liabilities={liabilities}
                availableYears={years}
                selectedYear={selectedYear}
            />
        </div>
    )
}
