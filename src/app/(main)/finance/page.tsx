import { getCurrentUser } from '@/lib/auth-service'
import { hasPermission } from '@/lib/permission-service'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'

import { getSettlements, getFinanceStats, getRegistrationTransactions, getUsersReadyForRefund, getAccruedPayoutLiabilities, syncMissingPayments } from '@/app/finance-actions'
import { Wallet, CheckCircle, Clock, CreditCard } from 'lucide-react'
import { FinanceClientTabs } from '@/components/finance/FinanceClientTabs'

export default async function FinancePage({
    searchParams: searchParamsPromise
}: {
    searchParams: Promise<{ year?: string; search?: string; tab?: string; page?: string }>
}) {
    const user = await getCurrentUser()
    if (!user) redirect('/')

    const searchParams = await searchParamsPromise

    // RBAC: Only roles with Finance & Settlements access
    if (!await hasPermission('settlements')) {
        redirect('/dashboard')
    }

    // Determine active tab from URL (Standardized source of truth)
    const activeTab = searchParams.tab || 'registrations'

    const currentPage = Number(searchParams.page) || 1
    const search = searchParams.search || ''
    const selectedYear = searchParams.year || '2026-2027'

    // 1. Data Category Logic (Strict Isolation)
    const isRegistrationsCategory = ['registrations', 'ready_refund', 'refund_history'].includes(activeTab)
    const isPayoutsCategory = ['payouts', 'payout_history'].includes(activeTab)
    const isWaiversCategory = ['liabilities_a', 'liabilities_b', 'waiver_history'].includes(activeTab)

    // 2. Status Mapping for Server Action
    const settlementStatus = (activeTab === 'payout_history' || activeTab === 'waiver_history') ? 'Processed' : 'Pending'

    // 3. Parallel Data Fetching with Category-Based Guarding
    const [academicYears, liabilitiesRes, registrationsRes, settlementsRes, readyRefundCountRes] = await Promise.all([
        prisma.academicYear.findMany({ orderBy: { year: 'desc' } }),

        (isWaiversCategory || (isPayoutsCategory && activeTab === 'payouts')) // Fetch liabilities for Groups A/B AND Payout Requests
            ? getAccruedPayoutLiabilities(selectedYear, search, undefined, currentPage, 20, activeTab === 'liabilities_a' ? 'A' : activeTab === 'liabilities_b' ? 'B' : undefined)
            : Promise.resolve({ success: true, data: [], totalCount: 0 }),

        (isRegistrationsCategory)
            ? getRegistrationTransactions('All', selectedYear, search, currentPage, 20, activeTab)
            : Promise.resolve({ success: true, data: [], totalCount: 0 }),

        (isPayoutsCategory || activeTab === 'waiver_history')
            ? getSettlements(settlementStatus, selectedYear, search, currentPage, 20, activeTab)
            : Promise.resolve({ success: true, data: [], totalCount: 0 }),

        // Dedicated fetch for the "Ready for Refund" badge count (Always persistent)
        getRegistrationTransactions('All', selectedYear, '', 1, 1, 'ready_refund')
    ])

    const availableYears = academicYears.map((y: any) => y.year)

    const settlements = (settlementsRes.success && settlementsRes.data) ? settlementsRes.data : []
    const totalSettlements = (settlementsRes.success && (settlementsRes as any).totalCount) ? (settlementsRes as any).totalCount : 0
    const registrations = (registrationsRes.success && registrationsRes.data) ? registrationsRes.data : []
    const totalRegistrations = (registrationsRes.success && (registrationsRes as any).totalCount) ? (registrationsRes as any).totalCount : 0
    const readyRefundCount = (readyRefundCountRes.success && (readyRefundCountRes as any).totalCount) ? (readyRefundCountRes as any).totalCount : 0
    const eligibleRefunds = activeTab === 'ready_refund' ? registrations : [] 
    const liabilities = (liabilitiesRes.success && 'data' in liabilitiesRes) ? (liabilitiesRes as any).data : []
    const totalLiabilities = (liabilitiesRes.success && 'totalCount' in liabilitiesRes) ? (liabilitiesRes as any).totalCount : 0

    return (
        <div className="space-y-8 animate-fade-in pb-10">
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

            <FinanceClientTabs
                settlements={settlements}
                registrations={registrations}
                eligibleRefunds={eligibleRefunds}
                liabilities={liabilities}
                totalRegistrations={totalRegistrations}
                readyRefundCount={readyRefundCount}
                totalLiabilities={totalLiabilities}
                totalSettlements={totalSettlements}
                availableYears={availableYears}
                selectedYear={selectedYear}
                search={search}
                currentPage={currentPage}
                activeTabProp={activeTab as any}
            />
        </div>
    )
}
