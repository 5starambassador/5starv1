'use client'

import { useState, useEffect } from 'react'
import { SettlementTable } from '@/components/finance/SettlementTable'
import { RegistrationTable } from '@/components/finance/RegistrationTable'
import { RefundReadyTable } from '@/components/finance/RefundReadyTable'
import { RefundHistoryTable } from '@/components/finance/RefundHistoryTable'
import { generatePDFReport } from '@/lib/pdf-export'
import { syncMissingPayments } from '@/app/finance-actions'
import { toast } from 'sonner'
import { Download, RefreshCw, LayoutList, Sparkles, History } from 'lucide-react'

interface FinanceClientTabsProps {
    settlements: any[]
    registrations: any[]
    eligibleRefunds: any[]
}

export function FinanceClientTabs({ settlements, registrations, eligibleRefunds }: FinanceClientTabsProps) {
    const [activeTab, setActiveTab] = useState<'payouts' | 'registrations' | 'ready_refund' | 'refund_history'>('payouts')
    const [isSyncing, setIsSyncing] = useState(false)
    const [isAutoSyncing, setIsAutoSyncing] = useState(false)

    // Filter refund history from registrations
    const refundHistory = registrations.filter(r => r.payments?.[0]?.adminRemarks?.includes('REFUNDED'))

    // Auto-Sync on Mount (Smart Mode)
    useEffect(() => {
        const runAutoSync = async () => {
            setIsAutoSyncing(true)
            try {
                // Pass false for "Smart Mode"
                const res = await syncMissingPayments(false)
                if (res.success && res.count && res.count > 0) {
                    // Only toast if we actually fixed something to avoid noise
                    toast.success(`Auto-sync: Fixed ${res.count} records`)
                    setTimeout(() => window.location.reload(), 1000)
                }
            } catch (err) {
                console.error("Auto-sync failed", err)
            } finally {
                setIsAutoSyncing(false)
            }
        }
        runAutoSync()
    }, [])

    const handleDownloadReport = () => {
        const reportMap = {
            payouts: {
                title: 'Settlement Payout Report',
                data: settlements,
                mapFn: (s: any) => ({
                    id: s.id.toString(),
                    userName: s.user?.fullName || 'Unknown',
                    amount: s.amount.toLocaleString(),
                    status: s.status,
                    bankName: s.user?.bankName || '-',
                    createdAt: new Date(s.createdAt).toLocaleDateString()
                }),
                cols: [
                    { header: 'ID', dataKey: 'id' },
                    { header: 'Ambassador', dataKey: 'userName' },
                    { header: 'Amount (₹)', dataKey: 'amount' },
                    { header: 'Status', dataKey: 'status' },
                    { header: 'Bank', dataKey: 'bankName' },
                    { header: 'Requested At', dataKey: 'createdAt' }
                ]
            },
            registrations: {
                title: 'Registration Fee Report',
                data: registrations,
                mapFn: (r: any) => ({
                    id: r.transactionId || r.userId.toString(),
                    parentName: r.fullName,
                    amount: (r.paymentAmount || 0).toLocaleString(),
                    status: r.paymentStatus,
                    createdAt: new Date(r.createdAt).toLocaleDateString()
                }),
                cols: [
                    { header: 'Tx ID', dataKey: 'id' },
                    { header: 'Parent Name', dataKey: 'parentName' },
                    { header: 'Amount (₹)', dataKey: 'amount' },
                    { header: 'Status', dataKey: 'status' },
                    { header: 'Date', dataKey: 'createdAt' }
                ]
            },
            ready_refund: {
                title: 'Eligible for Refund Report',
                data: eligibleRefunds,
                mapFn: (u: any) => ({
                    name: u.fullName,
                    campus: u.campusName,
                    amount: '25',
                    applied: new Date(u.createdAt).toLocaleDateString()
                }),
                cols: [
                    { header: 'Name', dataKey: 'name' },
                    { header: 'Campus', dataKey: 'campus' },
                    { header: 'Amount', dataKey: 'amount' },
                    { header: 'Reg Date', dataKey: 'applied' }
                ]
            },
            refund_history: {
                title: 'Refund Processed Report',
                data: refundHistory,
                mapFn: (r: any) => ({
                    name: r.fullName,
                    campus: r.campus?.campusName || r.assignedCampus || '-',
                    utr: r.payments?.[0]?.bankReference || 'N/A',
                    date: r.payments?.[0]?.adminRemarks?.match(/on ([\d-T:.Z]+)/)?.[1] ? new Date(r.payments?.[0]?.adminRemarks?.match(/on ([\d-T:.Z]+)/)?.[1]).toLocaleDateString() : 'Processed'
                }),
                cols: [
                    { header: 'Name', dataKey: 'name' },
                    { header: 'Campus', dataKey: 'campus' },
                    { header: 'UTR', dataKey: 'utr' },
                    { header: 'Date', dataKey: 'date' }
                ]
            }
        }

        const config = reportMap[activeTab] as any

        if (!config.data || config.data.length === 0) {
            toast.error(`No data to export for ${activeTab}`)
            return
        }

        generatePDFReport({
            title: config.title,
            subtitle: `Generated on ${new Date().toLocaleDateString()}`,
            fileName: `${activeTab}_${new Date().toISOString().split('T')[0]}`,
            columns: config.cols,
            data: config.data.map(config.mapFn)
        })
        toast.success('Report downloaded successfully')
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Custom Premium Tabs */}
                <div className="flex p-1 bg-gray-100/50 rounded-2xl w-fit border border-gray-200">
                    <button
                        onClick={() => setActiveTab('payouts')}
                        suppressHydrationWarning={true}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${activeTab === 'payouts' ? 'bg-white text-gray-900 shadow-md shadow-gray-200/50 scale-105' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        <LayoutList size={14} />
                        Payout Requests
                    </button>
                    <button
                        onClick={() => setActiveTab('registrations')}
                        suppressHydrationWarning={true}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${activeTab === 'registrations' ? 'bg-white text-emerald-700 shadow-md shadow-emerald-900/10 scale-105' : 'text-gray-500 hover:text-emerald-600'}`}
                    >
                        <LayoutList size={14} />
                        Registration Fees
                    </button>
                    <button
                        onClick={() => setActiveTab('ready_refund')}
                        suppressHydrationWarning={true}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${activeTab === 'ready_refund' ? 'bg-white text-amber-700 shadow-md shadow-amber-900/10 scale-105' : 'text-gray-500 hover:text-amber-600'}`}
                    >
                        <Sparkles size={14} className={eligibleRefunds.length > 0 ? "text-amber-500 animate-pulse" : ""} />
                        Ready for Refund {eligibleRefunds.length > 0 && <span className="ml-1 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[10px]" suppressHydrationWarning={true}>{eligibleRefunds.length}</span>}
                    </button>
                    <button
                        onClick={() => setActiveTab('refund_history')}
                        suppressHydrationWarning={true}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${activeTab === 'refund_history' ? 'bg-white text-blue-700 shadow-md shadow-blue-900/10 scale-105' : 'text-gray-500 hover:text-blue-600'}`}
                    >
                        <History size={14} />
                        Refund History
                    </button>
                </div>

                <div className="flex items-center gap-3">
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

                    <button
                        onClick={handleDownloadReport}
                        suppressHydrationWarning={true}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                    >
                        <Download size={14} />
                        <span>Download Report</span>
                    </button>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'payouts' ? (
                    <SettlementTable data={settlements || []} />
                ) : activeTab === 'registrations' ? (
                    <RegistrationTable data={registrations || []} />
                ) : activeTab === 'ready_refund' ? (
                    <RefundReadyTable data={eligibleRefunds} />
                ) : (
                    <RefundHistoryTable data={refundHistory} />
                )}
            </div>
        </div>
    )
}
