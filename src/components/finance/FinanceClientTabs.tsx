'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { SettlementTable } from '@/components/finance/SettlementTable'
import { RegistrationTable } from '@/components/finance/RegistrationTable'
import { RefundReadyTable } from '@/components/finance/RefundReadyTable'
import { RefundHistoryTable } from '@/components/finance/RefundHistoryTable'
import { PayoutHistoryTable } from '@/components/finance/PayoutHistoryTable'
import { LiabilityLedgerTable } from '@/components/finance/LiabilityLedgerTable'
import { WaiverHistoryTable } from '@/components/finance/WaiverHistoryTable'
import { generatePDFReport } from '@/lib/pdf-export'
import { syncMissingPayments } from '@/app/finance-actions'
import { toast } from 'sonner'
import { Download, RefreshCw, LayoutList, Sparkles, History } from 'lucide-react'

interface FinanceClientTabsProps {
    settlements: any[]
    registrations: any[]
    eligibleRefunds: any[]
    liabilities: any[]
    totalRegistrations?: number
    readyRefundCount?: number
    totalLiabilities?: number
    totalSettlements?: number
    currentPage?: number
    availableYears?: string[]
    selectedYear?: string
    search?: string
    activeTabProp?: 'payouts' | 'payout_history' | 'waiver_history' | 'registrations' | 'ready_refund' | 'refund_history' | 'liabilities_a' | 'liabilities_b'
}

export function FinanceClientTabs({
    settlements,
    registrations,
    eligibleRefunds,
    liabilities,
    totalRegistrations = 0,
    readyRefundCount = 0,
    totalLiabilities = 0,
    totalSettlements = 0,
    currentPage = 1,
    availableYears = [],
    selectedYear = '2026-2027',
    search = '',
    activeTabProp
}: FinanceClientTabsProps) {

    const activeTab = activeTabProp || 'payouts'
    const [displaySearch, setDisplaySearch] = useState(search)
    const isTypingRef = useRef(false)
    const router = useRouter()
    const pathname = usePathname()

    // Sync search input to prop
    useEffect(() => {
        if (!isTypingRef.current) {
            setDisplaySearch(search)
        }
    }, [search])

    // Derive Categories for Navigation UI
    const currentCategory = ['registrations', 'ready_refund', 'refund_history'].includes(activeTab) 
        ? 'registrations' 
        : ['payouts', 'payout_history'].includes(activeTab) 
        ? 'payouts' 
        : 'waivers'

    // Handle Tab Navigation (Centralized URL Source of Truth)
    const handleTabChange = (newTab: string) => {
        const getCategory = (t: string) => {
            if (['payouts', 'payout_history'].includes(t)) return 'payouts'
            if (['liabilities_a', 'liabilities_b', 'waiver_history'].includes(t)) return 'waivers'
            if (['registrations', 'ready_refund', 'refund_history'].includes(t)) return 'registrations'
            return 'other'
        }

        const oldCategory = getCategory(activeTab)
        const newCategory = getCategory(newTab)

        const params = new URLSearchParams(window.location.search)
        params.set('tab', newTab)
        params.set('page', '1') // Reset page on tab change

        // Unconditionally clear search on ANY tab change for a clean slate
        params.delete('search')
        setDisplaySearch('')

        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    // Debounced Search Sync
    useEffect(() => {
        const timer = setTimeout(() => {
            if (displaySearch !== search) {
                const params = new URLSearchParams(window.location.search)
                if (displaySearch) params.set('search', displaySearch)
                else params.delete('search')
                params.set('tab', activeTab)
                params.set('page', '1')
                router.push(`${pathname}?${params.toString()}`, { scroll: false })
            }
            isTypingRef.current = false
        }, 600)
        return () => clearTimeout(timer)
    }, [displaySearch, search, pathname, router, activeTab])

    const handleYearChange = (year: string) => {
        const params = new URLSearchParams(window.location.search)
        params.set('year', year)
        params.set('page', '1')
        router.push(`${pathname}?${params.toString()}`)
    }

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(window.location.search)
        params.set('page', page.toString())
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const handleSearchChange = (val: string) => {
        isTypingRef.current = true
        setDisplaySearch(val)
    }

    const [isSyncing, setIsSyncing] = useState(false)

    // Filter secondary data (Now strictly handled by server)
    const refundHistory = activeTab === 'refund_history' ? registrations : [] 
    const payoutHistoryData = activeTab === 'payout_history' ? settlements : []
    const waiverHistoryData = activeTab === 'waiver_history' ? settlements : []


    // Removed Auto-Sync on Mount to resolve 'MaxListenersExceededWarning' and improve page load speed.
    // Users can still trigger manually via 'Sync Cashfree' button.


    // Removed handleDownloadReport as per user request

    return (
        <div className="space-y-6">
            <div className="w-full space-y-4">
                {/* Level 1: Main Categories & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-2 p-1 bg-white/50 border border-gray-200/50 rounded-2xl w-fit">
                        <button
                            onClick={() => handleTabChange('payouts')}
                            suppressHydrationWarning={true}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all duration-300 ${['payouts', 'liabilities_b', 'payout_history'].includes(activeTab)
                                ? 'bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-lg shadow-gray-900/20 scale-105'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                        >
                            <LayoutList size={16} />
                            Cash Settlements
                        </button>
                        <button
                            onClick={() => handleTabChange('liabilities_a')}
                            suppressHydrationWarning={true}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all duration-300 ${['liabilities_a', 'waiver_history'].includes(activeTab)
                                ? 'bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-lg shadow-purple-900/20 scale-105'
                                : 'text-gray-500 hover:text-purple-700 hover:bg-purple-50'
                                }`}
                        >
                            <Sparkles size={16} />
                            Fee Waivers
                        </button>
                        <button
                            onClick={() => handleTabChange('registrations')}
                            suppressHydrationWarning={true}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all duration-300 ${['registrations', 'ready_refund', 'refund_history'].includes(activeTab)
                                ? 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg shadow-emerald-900/20 scale-105'
                                : 'text-gray-500 hover:text-emerald-700 hover:bg-emerald-50'
                                }`}
                        >
                            <RefreshCw size={16} />
                            Registrations & Refunds
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        {availableYears.length > 0 && (
                            <div className="flex items-center gap-2 bg-white/50 border border-gray-200 px-3 py-1.5 rounded-xl shadow-sm">
                                <span className="text-[10px] font-black text-gray-900 uppercase tracking-tighter">Cycle:</span>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => handleYearChange(e.target.value)}
                                    suppressHydrationWarning={true}
                                    aria-label="Filter by cycle year"
                                    className="bg-transparent text-xs font-bold text-gray-900 outline-none cursor-pointer focus:ring-0"
                                >
                                    <option value="All">Lifetime (All)</option>
                                    {availableYears.map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {activeTab === 'registrations' && (
                            <button
                                onClick={async () => {
                                    setIsSyncing(true)
                                    const tid = toast.loading('Force syncing recent payments...')
                                    try {
                                        const res = await syncMissingPayments(true)
                                        if (res.success) {
                                            toast.success(res.message, { id: tid })
                                            setTimeout(() => window.location.reload(), 1500)
                                        } else {
                                            toast.error(res.error || 'Sync failed', { id: tid })
                                        }
                                    } catch (error) {
                                        toast.error('Sync failed', { id: tid })
                                    } finally {
                                        setIsSyncing(false)
                                    }
                                }}
                                disabled={isSyncing}
                                suppressHydrationWarning={true}
                                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all border border-emerald-200/50 disabled:opacity-50"
                            >
                                <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                                <span>{isSyncing ? 'Syncing...' : 'Sync Cashfree'}</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Level 2: Sub-tabs based on Active Category */}
                <div className="flex flex-wrap items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                    {['payouts', 'liabilities_b', 'payout_history'].includes(activeTab) && (
                        <>
                            <button
                                onClick={() => handleTabChange('payouts')}
                                suppressHydrationWarning={true}
                                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${activeTab === 'payouts'
                                    ? 'bg-gray-100 border-gray-300 text-gray-900'
                                    : 'bg-white border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                Payout Requests
                            </button>
                            <button
                                onClick={() => handleTabChange('liabilities_b')}
                                suppressHydrationWarning={true}
                                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${activeTab === 'liabilities_b'
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                    : 'bg-white border-transparent text-gray-400 hover:text-indigo-600'
                                    }`}
                            >
                                Group B Ledger
                            </button>
                            <button
                                onClick={() => handleTabChange('payout_history')}
                                suppressHydrationWarning={true}
                                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${activeTab === 'payout_history'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-white border-transparent text-gray-400 hover:text-emerald-600'
                                    }`}
                            >
                                History
                            </button>
                        </>
                    )}

                    {['liabilities_a', 'waiver_history'].includes(activeTab) && (
                        <>
                            <button
                                onClick={() => handleTabChange('liabilities_a')}
                                suppressHydrationWarning={true}
                                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${activeTab === 'liabilities_a'
                                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                                    : 'bg-white border-transparent text-gray-400 hover:text-purple-600'
                                    }`}
                            >
                                Group A Ledger (Target)
                            </button>
                            <button
                                onClick={() => handleTabChange('waiver_history')}
                                suppressHydrationWarning={true}
                                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${activeTab === 'waiver_history'
                                    ? 'bg-purple-50 border-purple-200 text-purple-700'
                                    : 'bg-white border-transparent text-gray-400 hover:text-purple-600'
                                    }`}
                            >
                                Applied History
                            </button>
                        </>
                    )}

                    {['registrations', 'ready_refund', 'refund_history'].includes(activeTab) && (
                        <>
                            <button
                                onClick={() => handleTabChange('registrations')}
                                suppressHydrationWarning={true}
                                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${activeTab === 'registrations'
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                    : 'bg-white border-transparent text-gray-400 hover:text-emerald-600'
                                    }`}
                            >
                                All Registrations
                            </button>
                            <button
                                onClick={() => handleTabChange('ready_refund')}
                                suppressHydrationWarning={true}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border transition-all ${activeTab === 'ready_refund'
                                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                                    : 'bg-white border-transparent text-gray-400 hover:text-amber-600'
                                    }`}
                            >
                                Ready for Refund
                                {readyRefundCount > 0 && (
                                    <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 rounded-full">
                                        {readyRefundCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => handleTabChange('refund_history')}
                                suppressHydrationWarning={true}
                                className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${activeTab === 'refund_history'
                                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                                    : 'bg-white border-transparent text-gray-400 hover:text-blue-600'
                                    }`}
                            >
                                Refund History
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'payouts' ? (
                    <SettlementTable 
                        key={`pending-${selectedYear}-${currentPage}`}
                        data={settlements} 
                        totalResults={totalSettlements}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                        search={displaySearch}
                        onSearchChange={handleSearchChange}
                    />
                ) : activeTab === 'payout_history' ? (
                    <PayoutHistoryTable 
                        key={`payout-hist-${selectedYear}-${currentPage}`} 
                        data={settlements} 
                        totalResults={totalSettlements}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                        academicYear={selectedYear} 
                        search={displaySearch}
                        onSearchChange={handleSearchChange}
                    />
                ) : activeTab === 'registrations' ? (
                    <RegistrationTable
                        key={`reg-${selectedYear}-${currentPage}`}
                        data={registrations || []}
                        totalResults={totalRegistrations}
                        search={displaySearch}
                        onSearchChange={handleSearchChange}
                        academicYear={selectedYear}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                    />
                ) : activeTab === 'ready_refund' ? (
                    <RefundReadyTable 
                        key={`refund-ready-${selectedYear}-${currentPage}`} 
                        data={eligibleRefunds} 
                        totalResults={totalRegistrations} 
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                        academicYear={selectedYear} 
                        search={displaySearch}
                        onSearchChange={handleSearchChange}
                    />
                ) : activeTab === 'refund_history' ? (
                    <RefundHistoryTable 
                        key={`refund-hist-${selectedYear}-${currentPage}`} 
                        data={refundHistory} 
                        totalResults={totalRegistrations}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                        academicYear={selectedYear} 
                        search={displaySearch}
                        onSearchChange={handleSearchChange}
                    />
                ) : activeTab === 'liabilities_a' ? (
                    <LiabilityLedgerTable 
                        key={`ledger-a-${selectedYear}-${currentPage}`} 
                        data={liabilities} 
                        mode="A" 
                        academicYear={selectedYear} 
                        search={displaySearch} 
                        onSearchChange={handleSearchChange} 
                        totalResults={totalLiabilities} 
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                    />
                ) : activeTab === 'waiver_history' ? (
                    <WaiverHistoryTable 
                        key={`waiver-hist-${selectedYear}-${currentPage}`} 
                        data={settlements} 
                        totalResults={totalSettlements}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                        academicYear={selectedYear} 
                        search={displaySearch}
                        onSearchChange={handleSearchChange}
                    />
                ) : (
                    <LiabilityLedgerTable 
                        key={`ledger-b-${selectedYear}-${currentPage}`} 
                        data={liabilities} 
                        mode="B" 
                        academicYear={selectedYear} 
                        search={displaySearch} 
                        onSearchChange={handleSearchChange} 
                        totalResults={totalLiabilities} 
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                    />
                )}
            </div>
        </div>
    )
}
