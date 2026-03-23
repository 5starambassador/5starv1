'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { DataTable } from '@/components/ui/DataTable'
import { CheckCircle, Info, Send, AlertTriangle, Download, Search } from 'lucide-react'
import { formatIndianCurrency } from '@/lib/currency-utils'
import { bulkInitiateSettlements, bulkRecordWaiverAdjustments, releaseGranularBenefit } from '@/app/finance-actions'
import { toast } from 'sonner'
import { FileDown } from 'lucide-react'
import { ExportDateRangeModal } from './ExportDateRangeModal'
import { exportLiabilities } from '@/app/export-actions'

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
    academicYear?: string
    search?: string
    onSearchChange?: (val: string) => void
    totalResults?: number
    currentPage?: number
    onPageChange?: (page: number) => void
}

export function LiabilityLedgerTable({ 
    data, 
    mode, 
    academicYear, 
    search = '', 
    onSearchChange, 
    totalResults = 0, 
    currentPage = 1,
    onPageChange
}: LiabilityLedgerTableProps) {
    const router = useRouter()
    const pathname = usePathname()
    const [showExportModal, setShowExportModal] = useState(false)

    const handlePageChange = (page: number) => {
        if (onPageChange) {
            onPageChange(page)
        } else {
            const params = new URLSearchParams(window.location.search)
            params.set('page', page.toString())
            router.push(`${pathname}?${params.toString()}`, { scroll: false })
        }
    }

    const handleServerExport = async (start: Date, end: Date, status?: string, selectedColumns?: string[]) => {
        const res = await exportLiabilities(start, end, selectedColumns, academicYear, mode)
        if (res.success && res.csv) {
            const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', res.filename || 'liability_ledger.csv')
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            toast.success('Liability Ledger report downloaded')
        } else {
            toast.error(res.error || 'Failed to export')
        }
    }

    const exportColumns = [
        { id: 'academicYear', label: 'Academic Year', defaultChecked: true },
        { id: 'fullName', label: 'Ambassador Name', defaultChecked: true },
        { id: 'mobile', label: 'Mobile Number', defaultChecked: true },
        { id: 'role', label: 'Role', defaultChecked: true },
        { id: 'bankName', label: 'Bank Name', defaultChecked: true },
        { id: 'accountNumber', label: 'Account Number', defaultChecked: true },
        { id: 'ifscCode', label: 'IFSC Code', defaultChecked: true },
        { id: 'campus', label: 'Ambassador Campus', defaultChecked: true },
        { id: 'referrals', label: 'Confirmed Referrals', defaultChecked: true },
        { id: 'referralDetails', label: 'Referral Details (Names)', defaultChecked: true },
        { id: 'totalEarned', label: 'Total Earned', defaultChecked: true },
        { id: 'totalSettled', label: 'Total Settled', defaultChecked: true },
        { id: 'remaining', label: 'Outstanding', defaultChecked: true },
        { id: 'slab', label: 'Slab Reward', defaultChecked: true },
        { id: 'admission', label: 'Admission Share', defaultChecked: true },
        { id: 'donation', label: 'Donation Share', defaultChecked: true },
        { id: 'childName', label: 'Child Name', defaultChecked: mode === 'A' },
        { id: 'erpNo', label: 'Child ERP No', defaultChecked: mode === 'A' },
        { id: 'childGrade', label: 'Child Grade', defaultChecked: mode === 'A' },
        { id: 'childFee', label: 'Child Fee', defaultChecked: mode === 'A' },
        { id: 'group', label: 'Ledger Group', defaultChecked: true }
    ]
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [isProcessing, setIsProcessing] = useState(false)

    // Data is now pre-filtered by Group (A/B) on the server side
    const displayData = data

    const handleBulkInitiate = async () => {
        const groupBSelected = displayData.filter(l => selectedIds.includes(l.ledgerId))

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
            cell: (row: Liability) => (
                <div className="w-[150px]">
                    <div className="font-bold text-gray-900 leading-tight">{row.fullName}</div>
                    <div className="text-[10px] text-gray-500 font-medium">{row.mobileNumber}</div>
                    {row.referralCode && <div className="text-[9px] text-gray-400 font-mono">{row.referralCode}</div>}
                </div >
            )
        },
        {
            header: 'Role',
            accessorKey: 'role',
            filterable: true,
            filterOptions: ['Parent', 'Staff', 'Alumni', 'Others'],
            cell: (row: Liability) => (
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600 font-bold uppercase tracking-wider border border-gray-200">{row.role}</span>
            )
        },
        {
            header: 'Campus',
            accessorKey: 'campusName',
            filterable: true,
            cell: (row: Liability) => (
                row.campusName && row.campusName !== 'N/A' ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold uppercase tracking-wider border border-purple-100">{row.campusName}</span>
                ) : <span className="text-gray-300 text-[10px]">—</span>
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
                        <div className="text-[10px] font-bold text-gray-400">Fee: {row.childFee ? `₹${formatIndianCurrency(row.childFee)}` : 'N/A'}</div>
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
                    {row.hasMissingFeeData && (row.slabShare || 0) <= 0 ? (
                        <span className="text-[11px] font-bold text-gray-400 text-center">N/A</span>
                    ) : (
                        <span className="font-mono text-xs font-bold">₹{formatIndianCurrency(row.slabShare || 0)}</span>
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
                    ₹{formatIndianCurrency(row.admissionShare || 0)}
                </span>
            )
        },
        {
            header: 'Don (50%)',
            accessorKey: 'donationShare',
            cell: (row: Liability) => (
                <span className="font-mono text-xs text-orange-600 font-bold">
                    ₹{formatIndianCurrency(row.donationShare || 0)}
                </span>
            )
        },
        {
            header: 'Special Campus Bonus',
            accessorKey: 'specialBonusShare',
            cell: (row: Liability) => (
                <span className="font-mono text-xs font-bold text-teal-700">
                    ₹{formatIndianCurrency(row.specialBonusShare || 0)}
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
            cell: (row: Liability) => <span className="font-black text-sm text-gray-900">₹{formatIndianCurrency(row.totalEarned || 0)}</span>
        },
        {
            header: mode === 'A' ? 'Current Payout' : 'Rem. Payout',
            accessorKey: 'remainingAmount',
            cell: (row: Liability) => (
                <div className="bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 min-w-[80px] text-center">
                    <span className="font-black text-xs text-emerald-700">
                        ₹{formatIndianCurrency(row.remainingAmount || 0)}
                    </span>
                    {(row.totalSettled || 0) > 0 && (
                        <div className="text-[8px] text-emerald-600/60 font-medium">
                            Settled: ₹{formatIndianCurrency(row.totalSettled || 0)}
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
                                if (!confirm(`Apply ₹${formatIndianCurrency(row.remainingAmount)} Institutional Fee Waiver for ${row.fullName}?`)) return

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
                            suppressHydrationWarning={true}
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

                <button
                    onClick={() => setShowExportModal(true)}
                    suppressHydrationWarning={true}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-purple-700 border border-purple-200 rounded-lg text-xs font-bold hover:bg-purple-50 transition-all shadow-sm"
                >
                    <FileDown size={14} />
                    Download Report
                </button>

                {selectedIds.length > 0 && mode === 'A' && (
                    <button
                        onClick={async () => {
                            if (!confirm(`Are you sure you want to mark ${selectedIds.length} fee waivers as APPLIED? This will create a permanent record.`)) return

                            setIsProcessing(true)
                            const tid = toast.loading('Recording waiver adjustments...')

                            try {
                                const selectedItems = displayData.filter(l => selectedIds.includes(l.ledgerId))
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
                    data={displayData}
                    searchKey={["fullName", "mobileNumber", "referralCode", "campusName", "role"]}
                    searchPlaceholder={`Search ${mode === 'A' ? 'Group A' : 'Group B'} (Name, Mobile, ID, Campus)...`}
                    pageSize={20}
                    searchValue={search}
                    onSearchChange={onSearchChange}
                    enableMultiSelection={true}
                    onSelectionChange={(selected) => {
                        setSelectedIds(selected.map(s => (s as any).ledgerId))
                    }}
                    rowCount={totalResults}
                    pageCount={Math.ceil((totalResults || 0) / 20)}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                    manualPagination={true}
                    renderExpandedRow={(row: any) => {
                        const r = row as Liability;
                        return (
                            <div className="bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-200">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                                    <Search size={12} />
                                    Granular Audit: Student Referrals (FIFO Order)
                                </h5>

                                {r.referrals && r.referrals.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {r.referrals.map((ref: any, idx: number) => (
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
                                                <div className="flex flex-col gap-2 mt-3 border-t border-gray-50 pt-3">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-blue-600">Admission Share (80%)</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-mono font-bold">₹{formatIndianCurrency(ref.admShareValue || 0)}</span>
                                                            {ref.isAdmissionSettled ? (
                                                                <span className="text-[8px] bg-emerald-50 text-emerald-600 px-1 rounded border border-emerald-100 font-bold uppercase">Paid</span>
                                                            ) : ref.isAdmissionPending ? (
                                                                <span className="text-[8px] bg-amber-50 text-amber-600 px-1 rounded border border-amber-200 font-bold uppercase">Pending</span>
                                                            ) : ref.isAdmissionReady ? (
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!confirm(`Release Admission Share of ₹${formatIndianCurrency(ref.admShareValue || 0)} for ${ref.studentName || ref.fullName}?`)) return
                                                                        setIsProcessing(true)
                                                                        const res = await releaseGranularBenefit({
                                                                            userId: r.userId,
                                                                            amount: ref.admShareValue,
                                                                            benefitType: 'ADMISSION_SHARE',
                                                                            referralLeadId: ref.id,
                                                                            remarks: `Admission Share for ${ref.studentName || ref.fullName}`
                                                                        })
                                                                        if (res.success) {
                                                                            toast.success("Admission share payout initiated")
                                                                            router.refresh()
                                                                        } else {
                                                                            toast.error(res.error)
                                                                        }
                                                                        setIsProcessing(false)
                                                                    }}
                                                                    disabled={isProcessing}
                                                                    className="text-[9px] bg-blue-600 text-white px-2 py-0.5 rounded shadow-sm hover:bg-blue-700 font-bold"
                                                                >
                                                                    Release
                                                                </button>
                                                            ) : (
                                                                <span className="text-[8px] text-gray-400 font-medium italic">Wait for Fee</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-orange-600">Donation Share (50%)</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-mono font-bold">₹{formatIndianCurrency(ref.donShareValue || 0)}</span>
                                                            {ref.isDonationSettled ? (
                                                                <span className="text-[8px] bg-emerald-50 text-emerald-600 px-1 rounded border border-emerald-100 font-bold uppercase">Paid</span>
                                                            ) : ref.isDonationPending ? (
                                                                <span className="text-[8px] bg-amber-50 text-amber-600 px-1 rounded border border-amber-200 font-bold uppercase">Pending</span>
                                                            ) : ref.isDonationReady ? (
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!confirm(`Release Donation Share of ₹${formatIndianCurrency(ref.donShareValue || 0)} for ${ref.studentName || ref.fullName}?`)) return
                                                                        setIsProcessing(true)
                                                                        const res = await releaseGranularBenefit({
                                                                            userId: r.userId,
                                                                            amount: ref.donShareValue,
                                                                            benefitType: 'DONATION_SHARE',
                                                                            referralLeadId: ref.id,
                                                                            remarks: `Donation Share for ${ref.studentName || ref.fullName}`
                                                                        })
                                                                        if (res.success) {
                                                                            toast.success("Donation share payout initiated")
                                                                            router.refresh()
                                                                        } else {
                                                                            toast.error(res.error)
                                                                        }
                                                                        setIsProcessing(false)
                                                                    }}
                                                                    disabled={isProcessing}
                                                                    className="text-[9px] bg-orange-600 text-white px-2 py-0.5 rounded shadow-sm hover:bg-orange-700 font-bold"
                                                                >
                                                                    Release
                                                                </button>
                                                            ) : (
                                                                <span className="text-[8px] text-gray-400 font-medium italic">Wait for Fee</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-bold text-purple-600">Slab Reward ({ref.slabPercent ?? r.benefitPercent}%)</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-mono font-bold">₹{formatIndianCurrency(ref.referralSlabValue || 0)}</span>
                                                            {ref.isSlabSettled ? (
                                                                <span className="text-[8px] bg-emerald-50 text-emerald-600 px-1 rounded border border-emerald-100 font-bold uppercase">Paid</span>
                                                            ) : ref.isSlabPending ? (
                                                                <span className="text-[8px] bg-amber-50 text-amber-600 px-1 rounded border border-amber-200 font-bold uppercase">Pending</span>
                                                            ) : ref.isSlabReady ? (
                                                                <button
                                                                    onClick={async () => {
                                                                        if (!confirm(`Release Slab Reward of ₹${formatIndianCurrency(ref.referralSlabValue || 0)} for ${ref.studentName || ref.fullName}?`)) return
                                                                        setIsProcessing(true)
                                                                        const res = await releaseGranularBenefit({
                                                                            userId: r.userId,
                                                                            amount: ref.referralSlabValue,
                                                                            benefitType: 'SLAB_SHARE',
                                                                            referralLeadId: ref.id,
                                                                            remarks: `Slab Reward for ${ref.studentName || ref.fullName}`
                                                                        })
                                                                        if (res.success) {
                                                                            toast.success("Slab reward payout initiated")
                                                                            router.refresh()
                                                                        } else {
                                                                            toast.error(res.error)
                                                                        }
                                                                        setIsProcessing(false)
                                                                    }}
                                                                    disabled={isProcessing}
                                                                    className="text-[9px] bg-purple-600 text-white px-2 py-0.5 rounded shadow-sm hover:bg-purple-700 font-bold"
                                                                >
                                                                    {r.group === 'Group A' ? 'Apply Waiver' : 'Release'}
                                                                </button>
                                                            ) : (
                                                                <span className="text-[8px] text-gray-400 font-medium italic">Wait for Fee</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {ref.specialBonusValue > 0 && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-bold text-emerald-600">Special Campus Bonus</span>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-mono font-bold">₹{formatIndianCurrency(ref.specialBonusValue)}</span>
                                                                {ref.isSpecialBonusSettled ? (
                                                                    <span className="text-[8px] bg-emerald-50 text-emerald-600 px-1 rounded border border-emerald-100 font-bold uppercase">Paid</span>
                                                                ) : ref.isSpecialBonusPending ? (
                                                                    <span className="text-[8px] bg-amber-50 text-amber-600 px-1 rounded border border-amber-200 font-bold uppercase">Pending</span>
                                                                ) : ref.isSpecialBonusReady ? (
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (!confirm(`Release Special Campus Bonus of ₹${formatIndianCurrency(ref.specialBonusValue)} for ${ref.studentName || ref.fullName}?`)) return
                                                                            setIsProcessing(true)
                                                                            const res = await releaseGranularBenefit({
                                                                                userId: r.userId,
                                                                                amount: ref.specialBonusValue,
                                                                                benefitType: 'SPECIAL_BONUS',
                                                                                referralLeadId: ref.id,
                                                                                remarks: `Special Campus Bonus for ${ref.studentName || ref.fullName}`
                                                                            })
                                                                            if (res.success) {
                                                                                toast.success("Special bonus payout initiated")
                                                                                router.refresh()
                                                                            } else {
                                                                                toast.error(res.error)
                                                                            }
                                                                            setIsProcessing(false)
                                                                        }}
                                                                        disabled={isProcessing}
                                                                        className="text-[9px] bg-emerald-600 text-white px-2 py-0.5 rounded shadow-sm hover:bg-emerald-700 font-bold"
                                                                    >
                                                                        Release
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-[8px] text-gray-400 font-medium italic">Wait for Fee</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex justify-between items-end border-t border-gray-50 pt-2 mt-3 italic">
                                                    <div className="text-[9px] text-gray-400 font-mono">
                                                        Lead Status: {ref.leadStatus} • ID: {ref.leadId}
                                                    </div>
                                                    {ref.virtuallyPaidAmount > 0 && (
                                                        <div className="text-[10px] font-black text-emerald-600">
                                                            Legacy Settled: ₹{formatIndianCurrency(ref.virtuallyPaidAmount || 0)}
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
                        )
                    }}
                />
            </div>

            <ExportDateRangeModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleServerExport}
                title={`Export Liability Ledger (Group ${mode})`}
                showStatusFilter={false}
                columns={exportColumns}
            />

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
