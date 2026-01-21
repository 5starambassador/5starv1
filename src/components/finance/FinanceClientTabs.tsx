'use client'

import { useState, useEffect } from 'react'
import { SettlementTable } from '@/components/finance/SettlementTable'
import { RegistrationTable } from '@/components/finance/RegistrationTable'
import { generatePDFReport } from '@/lib/pdf-export'
import { syncMissingPayments } from '@/app/finance-actions'
import { toast } from 'sonner'
import { Download, RefreshCw } from 'lucide-react'

interface FinanceClientTabsProps {
    settlements: any[]
    registrations: any[]
}

export function FinanceClientTabs({ settlements, registrations }: FinanceClientTabsProps) {
    const [activeTab, setActiveTab] = useState<'payouts' | 'registrations'>('payouts')
    const [isSyncing, setIsSyncing] = useState(false)
    const [isAutoSyncing, setIsAutoSyncing] = useState(false)

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
        if (activeTab === 'payouts') {
            if (!settlements || settlements.length === 0) {
                toast.error('No settlement data to export')
                return
            }
            generatePDFReport({
                title: 'Settlement Payout Report',
                subtitle: `Generated on ${new Date().toLocaleDateString()}`,
                fileName: `settlements_${new Date().toISOString().split('T')[0]}`,
                columns: [
                    { header: 'ID', dataKey: 'id' },
                    { header: 'Ambassador', dataKey: 'userName' },
                    { header: 'Amount (₹)', dataKey: 'amount' },
                    { header: 'Status', dataKey: 'status' },
                    { header: 'Bank', dataKey: 'bankName' },
                    { header: 'Requested At', dataKey: 'createdAt' }
                ],
                data: settlements.map(s => ({
                    id: s.id.toString(),
                    userName: s.user?.fullName || 'Unknown',
                    amount: s.amount.toLocaleString(),
                    status: s.status,
                    bankName: s.user?.bankName || '-',
                    createdAt: new Date(s.createdAt).toLocaleDateString()
                }))
            })
            toast.success('Settlement report downloaded')
        } else {
            if (!registrations || registrations.length === 0) {
                toast.error('No registration data to export')
                return
            }
            generatePDFReport({
                title: 'Registration Fee Report',
                subtitle: `Incoming Fees | Generated on ${new Date().toLocaleDateString()}`,
                fileName: `registrations_${new Date().toISOString().split('T')[0]}`,
                columns: [
                    { header: 'Tx ID', dataKey: 'id' },
                    { header: 'Parent Name', dataKey: 'parentName' },
                    { header: 'Amount (₹)', dataKey: 'amount' },
                    { header: 'Status', dataKey: 'status' },
                    { header: 'Date', dataKey: 'createdAt' }
                ],
                data: registrations.map(r => ({
                    id: r.transactionId || r.userId.toString(),
                    parentName: r.fullName,
                    amount: (r.paymentAmount || 0).toLocaleString(),
                    status: r.paymentStatus,
                    createdAt: new Date(r.createdAt).toLocaleDateString()
                }))
            })
            toast.success('Registration report downloaded')
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Custom Premium Tabs */}
                <div className="flex p-1 bg-gray-100/50 rounded-2xl w-fit border border-gray-200">
                    <button
                        onClick={() => setActiveTab('payouts')}
                        suppressHydrationWarning={true}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'payouts' ? 'bg-white text-gray-900 shadow-md shadow-gray-200/50 scale-105' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Payout Requests
                    </button>
                    <button
                        onClick={() => setActiveTab('registrations')}
                        suppressHydrationWarning={true}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${activeTab === 'registrations' ? 'bg-white text-emerald-700 shadow-md shadow-emerald-900/10 scale-105' : 'text-gray-500 hover:text-emerald-600'}`}
                    >
                        Registration Fees (Incoming)
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {activeTab === 'registrations' && (
                        <button
                            onClick={async () => {
                                setIsSyncing(true)
                                const tid = toast.loading('Force syncing recent payments...')
                                try {
                                    // Pass true for "Force Mode"
                                    const res = await syncMissingPayments(true)
                                    if (res.success) {
                                        toast.success(res.message, { id: tid })
                                        // Slight delay before reload for toast visibility
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
                            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all border border-emerald-200/50 disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                            <span>{isSyncing ? 'Syncing...' : 'Sync with Cashfree'}</span>
                        </button>
                    )}

                    <button
                        onClick={handleDownloadReport}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
                    >
                        <Download size={14} />
                        <span>Download {activeTab === 'payouts' ? 'Payouts' : 'Registrations'} PDF</span>
                    </button>
                </div>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === 'payouts' ? (
                    <SettlementTable data={settlements || []} />
                ) : (
                    <RegistrationTable data={registrations || []} />
                )}
            </div>
        </div>
    )
}
