'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/components/ui/DataTable'
import { CheckCircle, Info, Send, AlertTriangle, Download, Search } from 'lucide-react'
import { bulkInitiateSettlements, bulkRecordWaiverAdjustments } from '@/app/finance-actions'
import { toast } from 'sonner'

interface Liability {
    ledgerId: string // Unique identifier for the ledger row (e.g. userId-A, userId-B)
    userId: number   // Original numeric user ID for settlements
    referralCode?: string // Ambassador ID like ACH26-P01708
    fullName: string
    mobileNumber: string
    role: string
    confirmedReferralCount: number
    benefitPercent: number
    totalEarned: number
    totalSettled: number
    remainingAmount: number
    group: string
    breakdown?: string[]
    admissionShare?: number
    donationShare?: number
    slabShare?: number
    specialBonusShare?: number
    appBonusPercent?: number
    payoutStatus?: string;
    childEprNo?: string;
    campusName?: string
    childName?: string
    childGrade?: string
    childCampus?: string
    childFee?: number
    referrals?: any[] // Added for granular tracking
    // Data quality flags
    hasMissingFeeData?: boolean
    missingFeeCampuses?: string[]
}

interface LiabilityLedgerTableProps {
    data: Liability[]
    mode: 'A' | 'B'
}

export function LiabilityLedgerTable({ data, mode }: LiabilityLedgerTableProps) {
    const router = useRouter()
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isProcessing, setIsProcessing] = useState(false)

    // Filter data based on mode
    const filteredData = data.filter(l => mode === 'A' ? (l.group || '').includes('A') : (l.group || '').includes('B'))

    const handleBulkInitiate = async () => {
        const groupBSelected = filteredData.filter(l => selectedIds.includes(l.ledgerId))

        if (groupBSelected.length === 0) {
            toast.error("Please select Group B ambassadors to initiate payouts.")
            return
        }

        setIsProcessing(true)
        const tid = toast.loading(`Initiating settlements for ${groupBSelected.length} ambassadors...`)

        try {
            const requests = groupBSelected.map(l => {
                // Generate a breakdown of referrals being settled
                const unsettled = (l.referrals || []).filter(r => r.payoutStatus !== 'PAID')
                const breakdownStr = unsettled.map(r => `${r.studentName || r.fullName} (₹${(l.remainingAmount / unsettled.length).toFixed(0)})`).join(', ')

                return {
                    userId: l.userId,
                    amount: l.remainingAmount,
                    referralBreakdown: breakdownStr
                }
            })

            const res = await bulkInitiateSettlements(requests)
            if (res.success) {
                toast.success(`Successfully initiated ${res.count} settlements. They are now in the 'Payout Requests' tab.`, { id: tid })
                setSelectedIds([])
                router.refresh()
            } else {
                toast.error(res.error || "Failed to initiate settlements", { id: tid })
            }
        } catch (err) {
            toast.error("An error occurred during bulk initiation", { id: tid })
        } finally {
            setIsProcessing(false)
        }
    }

    const columns = [
        {
            header: 'Ambassador',
            accessorKey: 'fullName',
            sortable: true,
            filterable: true,
            cell: (row: Liability) => (
                <div className="w-[150px]">
                    <div className="font-bold text-gray-900 leading-tight">{row.fullName}</div>
                    <div className="text-[10px] text-gray-500 font-medium">{row.mobileNumber}</div>
                    {row.referralCode && <div className="text-[9px] text-gray-400 font-mono">{row.referralCode}</div>}
                    <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 font-bold uppercase tracking-wider">{row.role}</span>
                        {row.campusName && row.campusName !== 'N/A' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold uppercase tracking-wider">{row.campusName}</span>
                        )}
                    </div>
                </div >
            )
        },
        // Group A Specific Columns
        ...(mode === 'A' ? [
            {
                header: 'Child Details',
                accessorKey: 'childName',
                cell: (row: Liability) => (
                    <div className="w-[150px]">
                        <div className="text-xs font-black text-blue-700 leading-tight">{row.childName || 'N/A'}</div>
                        <div className="text-[10px] text-gray-500">{row.childGrade} • {row.childCampus}</div>
                        <div className="text-[10px] font-bold text-gray-400">Fee: {row.childFee ? `₹${row.childFee.toLocaleString()}` : 'N/A'}</div>
                        {row.childEprNo && <div className="text-[9px] text-gray-400 font-mono">ERP: {row.childEprNo}</div>}
                    </div>
                )
            }
        ] : []),
        {
            header: 'Slab Reward',
            accessorKey: 'slabShare',
            sortable: true,
            cell: (row: Liability) => (
                <div className="flex flex-col gap-0.5">
                    {row.hasMissingFeeData ? (
                        <span className="text-[11px] font-bold text-gray-400">N/A</span>
                    ) : (
                        <span className="font-mono text-xs font-bold">₹{(row.slabShare || 0).toLocaleString()}</span>
                    )}
                    <span className="text-[10px] text-gray-400">Tier: {row.benefitPercent}%</span>
                </div>
            )
        },
        {
            header: 'Adm (80%)',
            accessorKey: 'admissionShare',
            cell: (row: Liability) => (
                <span className="font-mono text-xs text-blue-600 font-bold">
                    ₹{(row.admissionShare || 0).toLocaleString()}
                </span>
            )
        },
        {
            header: 'Don (50%)',
            accessorKey: 'donationShare',
            cell: (row: Liability) => (
                <span className="font-mono text-xs text-orange-600 font-bold">
                    ₹{(row.donationShare || 0).toLocaleString()}
                </span>
            )
        },
        {
            header: 'Special Campus Bonus',
            accessorKey: 'specialBonusShare',
            cell: (row: Liability) => (
                <span className="font-mono text-xs font-bold text-teal-700">
                    ₹{(row.specialBonusShare || 0).toLocaleString()}
                </span>
            )
        },
        // App Bonus column only for Group A
        ...(mode === 'A' ? [
            {
                header: 'App Bonus',
                accessorKey: 'appBonusPercent',
                cell: (row: Liability) => (
                    row.appBonusPercent ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold">
                            +{row.appBonusPercent}%
                        </span>
                    ) : <span className="text-xs text-gray-300">—</span>
                )
            }
        ] : []),
        {
            header: 'Total Yield',
            accessorKey: 'totalEarned',
            sortable: true,
            cell: (row: Liability) => <span className="font-black text-sm text-gray-900">₹{(row.totalEarned || 0).toLocaleString()}</span>
        },
        {
            header: mode === 'A' ? 'Current Payout' : 'Rem. Payout',
            accessorKey: 'remainingAmount',
            cell: (row: Liability) => (
                <div className="bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 min-w-[80px] text-center">
                    <span className="font-black text-xs text-emerald-700">
                        ₹{(row.remainingAmount || 0).toLocaleString()}
                    </span>
                    {(row.totalSettled || 0) > 0 && (
                        <div className="text-[8px] text-emerald-600/60 font-medium">
                            Settled: ₹{(row.totalSettled || 0).toLocaleString()}
                        </div>
                    )}
                </div>
            )
        },
        // Action Column for Individual Processing
        {
            header: 'Action',
            accessorKey: 'ledgerId',
            cell: (row: Liability) => (
                <div className="flex justify-center">
                    {row.remainingAmount > 0 && (
                        <button
                            onClick={async () => {
                                if (!confirm(`Apply ₹${row.remainingAmount.toLocaleString()} Institutional Fee Waiver for ${row.fullName}?`)) return

                                setIsProcessing(true)
                                const tid = toast.loading(`Applying waiver for ${row.fullName}...`)

                                try {
                                    const unsettled = (row.referrals || []).filter(r => r.payoutStatus !== 'PAID')
                                    const breakdownStr = unsettled.map(r => `${r.studentName || r.fullName}`).join(', ')

                                    const res = await bulkRecordWaiverAdjustments([{
                                        userId: row.userId,
                                        amount: row.remainingAmount,
                                        childName: row.childName,
                                        childEprNo: row.childEprNo,
                                        referralBreakdown: breakdownStr
                                    }])

                                    if (res.success) {
                                        toast.success(`Successfully applied waiver for ${row.fullName}.`, { id: tid })
                                        setTimeout(() => window.location.reload(), 1000)
                                    } else {
                                        toast.error(res.error || "Failed to record waiver", { id: tid })
                                    }
                                } catch (err) {
                                    toast.error("An error occurred", { id: tid })
                                } finally {
                                    setIsProcessing(false)
                                }
                            }}
                            disabled={isProcessing}
                            className="px-3 py-1 bg-purple-100 text-purple-700 hover:bg-purple-600 hover:text-white rounded-md text-[10px] font-black transition-all border border-purple-200 uppercase tracking-tight"
                        >
                            Apply
                        </button>
                    )}
                </div>
            )
        }
    ]

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between bg-purple-50 p-4 rounded-xl border border-purple-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                        <Info size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-purple-900">
                            {mode === 'A' ? 'Group A: Institutional Fee Waivers' : 'Group B: Cash Payout Ledger'}
                        </h4>
                        <p className="text-xs text-purple-700/70 font-medium">
                            {mode === 'A'
                                ? 'Auto-calculated concessions based on ambassador child fees.'
                                : 'Accrued cash rewards ready for bank settlement.'}
                        </p>
                    </div>
                </div>

                {selectedIds.length > 0 && mode === 'B' && (
                    <button
                        onClick={handleBulkInitiate}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-all shadow-md shadow-purple-900/20"
                    >
                        <Send size={14} />
                        Generate {selectedIds.length} Settlements
                    </button>
                )}

                {mode === 'A' && (
                    <button
                        onClick={() => {
                            const csvContent = [
                                ['Ambassador Name', 'Mobile Number', 'Campus', 'Child Name', 'Child Grade', 'Child Fee', 'Waiver Amount', 'Status'],
                                ...filteredData.map(row => [
                                    row.fullName,
                                    row.mobileNumber,
                                    row.campusName || 'N/A',
                                    row.childName || 'N/A',
                                    row.childGrade || 'N/A',
                                    row.childFee || 0,
                                    row.remainingAmount,
                                    'Accrued'
                                ])
                            ].map(e => e.join(",")).join("\n")

                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                            const url = URL.createObjectURL(blob)
                            const link = document.createElement("a")
                            link.setAttribute("href", url)
                            link.setAttribute("download", `Waiver_Report_${new Date().toISOString().split('T')[0]}.csv`)
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-purple-700 border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-50 transition-all shadow-sm"
                    >
                        <Download size={14} />
                        Download Report
                    </button>
                )}

                {selectedIds.length > 0 && mode === 'A' && (
                    <button
                        onClick={async () => {
                            if (!confirm(`Are you sure you want to mark ${selectedIds.length} fee waivers as APPLIED? This will create a permanent record.`)) return

                            setIsProcessing(true)
                            const tid = toast.loading('Recording waiver adjustments...')

                            try {
                                const selectedItems = filteredData.filter(l => selectedIds.includes(l.ledgerId))
                                const requests = selectedItems.map(l => {
                                    const unsettled = (l.referrals || []).filter(r => r.payoutStatus !== 'PAID')
                                    const breakdownStr = unsettled.map(r => `${r.studentName || r.fullName}`).join(', ')

                                    return {
                                        userId: l.userId,
                                        amount: l.remainingAmount,
                                        childName: l.childName,
                                        childEprNo: l.childEprNo,
                                        referralBreakdown: breakdownStr
                                    }
                                })

                                const res = await bulkRecordWaiverAdjustments(requests)

                                if (res.success) {
                                    toast.success(`Successfully recorded ${res.count} waiver adjustments.`, { id: tid })
                                    setSelectedIds([])
                                    setTimeout(() => window.location.reload(), 1500)
                                } else {
                                    toast.error(res.error || "Failed to record waivers", { id: tid })
                                }
                            } catch (err) {
                                toast.error("An error occurred", { id: tid })
                            } finally {
                                setIsProcessing(false)
                            }
                        }}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-all shadow-md shadow-purple-900/20"
                    >
                        <CheckCircle size={14} />
                        Mark {selectedIds.length} as Applied
                    </button>
                )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <DataTable
                    uniqueKey="ledgerId"
                    columns={columns as any}
                    data={filteredData}
                    searchKey="fullName"
                    searchPlaceholder="Search ambassador..."
                    enableMultiSelection={true}
                    onSelectionChange={(selected) => {
                        setSelectedIds(selected.map(s => s.ledgerId))
                    }}
                    renderExpandedRow={(row) => (
                        <div className="bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200">
                            <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                                <Search size={12} />
                                Granular Audit: Student Referrals (FIFO Order)
                            </h5>

                            {row.referrals && row.referrals.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {row.referrals.map((ref: any, idx: number) => (
                                        <div key={idx} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="text-xs font-black text-gray-900 leading-tight">{ref.studentName || ref.fullName}</div>
                                                    <div className="text-[10px] text-gray-500 font-medium">
                                                        {ref.gradeInterested} • {ref.campus}
                                                        {ref.admissionNumber && <span className="ml-2 text-indigo-600 font-bold bg-indigo-50 px-1 rounded uppercase tracking-tighter">({ref.admissionNumber})</span>}
                                                    </div>
                                                </div>
                                                <span className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase tracking-wider ${ref.payoutStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                                    ref.payoutStatus === 'PARTIAL' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                        'bg-gray-50 text-gray-400 border border-gray-100'
                                                    }`}>
                                                    {ref.payoutStatus}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-end border-t border-gray-50 pt-2 mt-auto">
                                                <div className="text-[9px] text-gray-400 font-mono">
                                                    Ref ID: {ref.leadId}
                                                </div>
                                                {ref.virtuallyPaidAmount && (
                                                    <div className="text-[10px] font-black text-emerald-600">
                                                        Settled: ₹{ref.virtuallyPaidAmount.toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 text-gray-400">
                                    <p className="text-xs font-bold uppercase tracking-widest">No detailed referral data linked</p>
                                </div>
                            )}
                        </div>
                    )}
                />
            </div>

            <div className="flex gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                <div className="text-xs text-amber-800 space-y-1">
                    <p className="font-bold">Important Policy Reminders:</p>
                    <ul className="list-disc list-inside space-y-0.5 opacity-80">
                        <li>Group A (Waivers) should be reconciled with the Fee Ledger before year-end.</li>
                        <li>Group B Payouts require verified Bank Details in the Ambassador profile.</li>
                        <li>The values above include tiered slabs, profit sharing, and special bonuses.</li>
                        <li>Rows marked <strong>N/A</strong> in Slab Reward have no fee data in Campus Master — seed the Grade-1 fee to complete the calculation.</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
