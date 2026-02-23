'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DataTable } from '@/components/ui/DataTable'
import { PaymentModal } from './PaymentModal'
import { CheckCircle, Clock, Download, Upload, Loader2, FileDown } from 'lucide-react'
import { format } from 'date-fns'
import { processBulkPayouts, syncPastRefunds, bulkProcessPayoutsById, processPayout } from '@/app/finance-actions'
import { toast } from 'sonner'
import { exportPayouts } from '@/app/export-actions'
import { ExportDateRangeModal } from './ExportDateRangeModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface Settlement {
    id: number
    amount: number
    status: 'Pending' | 'Processed'
    createdAt: string | Date
    payoutDate: string | Date | null
    remarks?: string | null
    user: {
        fullName: string
        mobileNumber: string
        role: string
        bankAccountDetails: string | null
        bankName?: string | null
        accountNumber?: string | null
        ifscCode?: string | null
    }
}

interface SettlementTableProps {
    data: Settlement[]
}

export function SettlementTable({ data }: SettlementTableProps) {
    const router = useRouter()
    const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [showExportModal, setShowExportModal] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Dialog States
    const [showAlert, setShowAlert] = useState(false)
    const [alertConfig, setAlertConfig] = useState({ title: '', description: '' })
    const [showBulkConfirm, setShowBulkConfirm] = useState(false)
    const [pendingPayoutsToProcess, setPendingPayoutsToProcess] = useState<{
        mobile: string,
        amount: number,
        transactionId: string,
        bankName?: string,
        accountNumber?: string,
        ifscCode?: string,
        date?: string
    }[]>([])
    const [pastPayoutsToSync, setPastPayoutsToSync] = useState<{
        mobile: string,
        utr: string,
        bankName?: string,
        accountNumber?: string,
        ifscCode?: string,
        date?: string
    }[]>([])
    const [syncMode, setSyncMode] = useState<'mobile'>('mobile')
    const [selectedIds, setSelectedIds] = useState<number[]>([])

    // Export for Bank Processing
    const handleBankExport = (itemsToExport?: Settlement[]) => {
        const pendingPayouts = itemsToExport || data.filter(s => s.status === 'Pending')
        if (pendingPayouts.length === 0) {
            setAlertConfig({ title: 'No Pending Payouts', description: 'There are no pending payouts to export at this time.' })
            setShowAlert(true)
            return
        }

        const csvHeaders = [
            'Beneficiary Name',
            'Role',
            'Mobile',
            'Bank Name',
            'Account Number',
            'IFSC Code',
            'Amount',
            'Request Date',
            'Remarks'
        ]

        // Senior Expert CSV Formatting Helper
        const formatCSVField = (val: string | number | null | undefined, isNumericId: boolean = false) => {
            if (val === null || val === undefined) return '""'
            let str = String(val).replace(/"/g, '""') // Escape quotes

            // Critical Prefix for Bank Exports:
            // Excel strips leading zeros and converts long IDs to scientific notation (1.23E+14).
            // Prefixing with a TAB (\t) is the most professional way to force Excel to treat it as TEXT
            // without showing a visible character like a single quote.
            if (isNumericId && str && str !== 'N/A') {
                return `"\t${str}"`
            }

            return `"${str}"`
        }

        const rows = pendingPayouts.map(s => {
            // Use the specific fields exactly as the user updated them
            // No more 'hasStructuredData' switch that overwrites individual updates
            let bankName = s.user.bankName || ''
            let accNo = s.user.accountNumber || ''
            let ifsc = s.user.ifscCode || ''

            // Fallback to legacy blob ONLY for the bankName field if it's empty
            // Ensuring we don't blanket overwrite any partial updates the user made to individual fields
            if (!bankName && s.user.bankAccountDetails && s.user.bankAccountDetails !== 'N/A') {
                bankName = s.user.bankAccountDetails
            }

            return [
                formatCSVField(s.user.fullName),
                formatCSVField(s.user.role),
                formatCSVField(s.user.mobileNumber, true), // Mobile as text
                formatCSVField(bankName),
                formatCSVField(accNo, true),     // Account as text
                formatCSVField(ifsc),
                formatCSVField(s.amount),
                formatCSVField(format(new Date(s.createdAt), 'dd-MM-yyyy')), // standard format for Indian banks
                formatCSVField(s.remarks || 'Payout Batch')
            ].join(',')
        })

        // CSV Construction with \uFEFF BOM (Byte Order Mark) for Excel UTF-8 identification
        const csvContent = "\uFEFF" + csvHeaders.join(',') + "\n" + rows.join("\n")

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `Payout_Batch_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const handleBulkExportSelected = () => {
        const selectedPending = data.filter(s => selectedIds.includes(s.id) && s.status === 'Pending')
        if (selectedPending.length === 0) {
            toast.error("Please select pending payouts to export.")
            return
        }
        handleBankExport(selectedPending)
    }

    const handleBulkPaySelected = () => {
        const selectedPending = data.filter(s => selectedIds.includes(s.id) && s.status === 'Pending')
        if (selectedPending.length === 0) {
            toast.error("Please select pending payouts to pay.")
            return
        }
        setSelectedSettlement({
            id: -1, // Special ID for bulk
            amount: selectedPending.reduce((sum, s) => sum + s.amount, 0),
            status: 'Pending',
            createdAt: new Date(),
            payoutDate: null,
            remarks: `Bulk payout for ${selectedPending.length} items`,
            user: {
                fullName: 'Multiple Selected',
                mobileNumber: 'Bulk',
                role: 'N/A',
                bankAccountDetails: null
            }
        } as any)
        setIsModalOpen(true)
    }

    const handleDownloadTemplate = () => {
        const headers = ['Beneficiary Name', 'Role', 'Mobile', 'Bank Name', 'Account Number', 'IFSC Code', 'Amount', 'Date', 'Remarks']
        const sampleRow = ['John Doe', 'Staff', "'9876543210", 'Bank Name', "'123456789", 'ABCD0001234', '25', '2026-01-19', 'Registration Fee Refund']
        const csvContent = "\uFEFF" + headers.join(',') + "\n" + sampleRow.join(',')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", "Payout_Upload_Template.csv")
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        const reader = new FileReader()

        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string
                const rows = text.split('\n').filter(r => r.trim() !== '')

                const parseCSVLine = (line: string) => {
                    const result = []
                    let current = ''
                    let inQuotes = false
                    for (let i = 0; i < line.length; i++) {
                        const char = line[i]
                        if (char === '"') {
                            inQuotes = !inQuotes
                        } else if (char === ',' && !inQuotes) {
                            result.push(current.trim())
                            current = ''
                        } else {
                            current += char
                        }
                    }
                    result.push(current.trim())
                    return result
                }

                const cleanVal = (val: string | undefined) => {
                    if (!val) return ""
                    // Remove quotes and whitespace
                    let cleaned = val.replace(/^"|"$/g, '').trim()

                    // Senior Expert Handling: Strip invisible prefixes (Tab or Quote)
                    // We add a TAB (\t) or quote (') in export to stop scientific notation.
                    // We must strip it here so the ID (mobile/account) is clean.
                    if (cleaned.startsWith("'") || cleaned.startsWith("\t")) {
                        cleaned = cleaned.substring(1).trim()
                    }

                    // Handle Scientific Notation in Account Numbers (Excel fallback issue)
                    if (cleaned.toLowerCase().includes('e+')) {
                        const num = Number(cleaned)
                        if (!isNaN(num)) return num.toLocaleString('fullwide', { useGrouping: false })
                    }
                    return cleaned
                }

                const parsedRecords = []
                for (let i = 1; i < rows.length; i++) {
                    const cols = parseCSVLine(rows[i])
                    if (cols.length < 2) continue

                    let mobile = ''
                    let bankName = '', accountNumber = '', ifscCode = '', utr = '', dateStr = '', amountStr = ''

                    const getBestUTR = (candidates: string[]) => {
                        const skipTerms = ['refund', 'fee', 'registration', 'remarks', 'payout', 'payment']
                        // 1. Try to find a value that doesn't contain skip terms and is alphanumeric
                        for (const v of candidates) {
                            if (!v || v.length < 5) continue
                            const lower = v.toLowerCase()
                            if (!skipTerms.some(t => lower.includes(t)) && /[0-9]/.test(v)) return v
                        }
                        // 2. Fallback to anything non-empty and non-remark
                        for (const v of candidates) {
                            if (!v) continue
                            const lower = v.toLowerCase()
                            if (!skipTerms.some(t => lower.includes(t))) return v
                        }
                        return candidates[0] || ''
                    }

                    if (cols.length >= 10) {
                        mobile = cleanVal(cols[2]) // Mobile is at index 2 in the new format with Role
                        bankName = cleanVal(cols[4]) // Shifted due to Role col if exists
                        accountNumber = cleanVal(cols[5])
                        ifscCode = cleanVal(cols[6])
                        amountStr = cleanVal(cols[7])
                        dateStr = cleanVal(cols[8])
                        utr = getBestUTR([cleanVal(cols[9]), cleanVal(cols[10]), cleanVal(cols[cols.length - 1])])
                    } else if (cols.length === 9) {
                        // New Standard Export Order: 0:Name, 1:Role, 2:Mobile, 3:Bank, 4:Acc, 5:IFSC, 6:Amount, 7:Date, 8:Remarks
                        mobile = cleanVal(cols[2])
                        bankName = cleanVal(cols[3])
                        accountNumber = cleanVal(cols[4])
                        ifscCode = cleanVal(cols[5])
                        amountStr = cleanVal(cols[6])
                        dateStr = cleanVal(cols[7])
                        utr = getBestUTR([cleanVal(cols[8])])
                    } else if (cols.length === 8) {
                        // Legacy Export Order: 0:Name, 1:Mobile, 2:Bank, 3:Acc, 4:IFSC, 5:Amount, 6:Date, 7:Remarks
                        mobile = cleanVal(cols[1])
                        bankName = cleanVal(cols[2])
                        accountNumber = cleanVal(cols[3])
                        ifscCode = cleanVal(cols[4])
                        amountStr = cleanVal(cols[5])
                        dateStr = cleanVal(cols[6])
                        utr = getBestUTR([cleanVal(cols[7])])
                    } else {
                        // Fallback for older or simpler formats, assume mobile is at index 1
                        mobile = cleanVal(cols[1])
                        utr = cleanVal(cols[cols.length - 1])
                    }

                    if (!mobile) continue

                    if (!utr || utr.length < 3) {
                        const prefix = syncMode === 'mobile' ? 'Bulk-Synced' : 'Bulk'
                        utr = `${prefix}-${format(new Date(), 'yyyyMMdd')}`
                    }

                    parsedRecords.push({
                        mobile,
                        utr,
                        bankName,
                        accountNumber,
                        ifscCode,
                        date: dateStr,
                        amount: parseFloat(amountStr) || 0
                    })
                }

                if (parsedRecords.length === 0) {
                    toast.error("No valid records found.")
                    setIsUploading(false)
                    return
                }

                if (syncMode === 'mobile') {
                    setPastPayoutsToSync(parsedRecords.map(r => ({
                        mobile: r.mobile,
                        utr: r.utr,
                        bankName: r.bankName,
                        accountNumber: r.accountNumber,
                        ifscCode: r.ifscCode,
                        date: r.date
                    })))
                    setShowBulkConfirm(true)
                } else {
                    const toProcess = parsedRecords.filter(r => r.amount > 0).map(r => ({
                        mobile: r.mobile,
                        amount: r.amount,
                        transactionId: r.utr,
                        bankName: r.bankName,
                        accountNumber: r.accountNumber,
                        ifscCode: r.ifscCode,
                        date: r.date
                    }))

                    if (toProcess.length === 0) {
                        toast.error("No valid records with amount > 0 found.")
                        setIsUploading(false)
                        return
                    }

                    setPendingPayoutsToProcess(toProcess)
                    setShowBulkConfirm(true)
                }
            } catch (err) {
                console.error(err)
                toast.error("Failed to parse CSV file.")
            } finally {
                setIsUploading(false)
                if (fileInputRef.current) fileInputRef.current.value = ''
            }
        }
        reader.readAsText(file)
    }

    const downloadStatusCSV = (results: any[]) => {
        toast.info("Preparing import summary report...")
        const headers = ["Mobile", "Amount", "Status", "Message"]
        const csvContent = [
            headers.join(","),
            ...results.map(r => [
                r.mobile,
                r.amount,
                r.status,
                `"${(r.message || '').replace(/"/g, '""')}"`
            ].join(","))
        ].join("\n")

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `import_report_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`)
        document.body.appendChild(link)

        // Small delay to ensure browser readiness
        setTimeout(() => {
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
            toast.success("Import report downloaded")
        }, 100)
    }

    const confirmBulkProcess = async () => {
        setShowBulkConfirm(false)
        setIsUploading(true)
        try {
            if (syncMode === 'mobile') {
                const res = await syncPastRefunds(pastPayoutsToSync)
                if (res.success && res.stats) {
                    const { success, alreadyRefunded, notFound } = res.stats
                    toast.success(`Sync Complete: ${success} processed, ${alreadyRefunded} already done, ${notFound} not found.`)

                    if (res.results && res.results.length > 0) {
                        downloadStatusCSV(res.results)
                    }

                    router.refresh()
                } else {
                    toast.error(res.error)
                }
            } else {
                const res = await processBulkPayouts(pendingPayoutsToProcess)
                if (res.success) {
                    toast.success(res.message)
                    if (res.results && res.results.length > 0) {
                        downloadStatusCSV(res.results)
                    }
                    router.refresh()
                } else {
                    toast.error(res.error)
                }
            }
        } catch (err) {
            toast.error("Bulk processing failed.")
        } finally {
            setIsUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    const columns = [
        {
            header: 'Ambassador',
            accessorKey: 'user.fullName',
            sortable: true,
            filterable: true,
            cell: (row: Settlement) => (
                <div suppressHydrationWarning>
                    <div className="font-bold text-gray-900 dark:text-white">{row.user.fullName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{row.user.role} • {row.user.mobileNumber}</div>
                </div>
            )
        },
        {
            header: 'Bank Details',
            accessorKey: 'user.bankName',
            cell: (row: Settlement) => (
                <div className="max-w-[150px] text-xs" suppressHydrationWarning>
                    {(row.user.bankName && row.user.accountNumber) ? (
                        <div className="flex flex-col">
                            <span className="font-bold text-gray-700 dark:text-gray-300 truncate" title={row.user.bankName}>{row.user.bankName}</span>
                            <span className="font-mono text-gray-500 dark:text-gray-400 select-all">{row.user.accountNumber}</span>
                            <span className="text-[10px] text-gray-400 font-mono">{row.user.ifscCode}</span>
                        </div>
                    ) : (
                        <span className="text-gray-400 italic" title={row.user.bankAccountDetails || ''}>
                            {row.user.bankAccountDetails || 'Not Provided'}
                        </span>
                    )}
                </div>
            )
        },
        {
            header: 'Amount',
            accessorKey: 'amount',
            sortable: true,
            cell: (row: Settlement) => <span suppressHydrationWarning className="font-bold font-mono text-primary-red dark:text-red-400">₹{row.amount.toLocaleString()}</span>
        },
        {
            header: 'Status',
            accessorKey: 'status',
            sortable: true,
            filterable: true,
            cell: (row: Settlement) => {
                const isProcessed = row.status === 'Processed'
                return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${isProcessed
                        ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800'
                        : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800'
                        }`}>
                        {isProcessed ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {row.status}
                    </span>
                )
            }
        },
        {
            header: 'Date',
            accessorKey: 'createdAt',
            sortable: true,
            cell: (row: Settlement) => <span suppressHydrationWarning>{format(new Date(row.createdAt), 'dd MMM yyyy')}</span>
        },
        {
            header: 'Action',
            accessorKey: 'id',
            cell: (row: Settlement) => {
                if (row.status === 'Processed' && row.payoutDate) {
                    return <span className="text-xs text-gray-400 dark:text-gray-500">Paid on {format(new Date(row.payoutDate), 'dd MMM')}</span>
                }

                return (
                    <button
                        onClick={() => {
                            setSelectedSettlement(row)
                            setIsModalOpen(true)
                        }}
                        suppressHydrationWarning
                        className="bg-black text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-800 transition-colors shadow-sm dark:bg-white dark:text-black dark:hover:bg-gray-200"
                    >
                        Pay Now
                    </button>
                )
            }
        }
    ]

    const handleServerExport = async (start: Date, end: Date, status?: string) => {
        const res = await exportPayouts(start, end, status)
        if (res.success && res.csv) {
            const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', res.filename || 'payouts.csv')
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            toast.success('Payout Report downloaded')
        } else {
            toast.error(res.error || 'Failed to export')
        }
    }

    const exportColumns = [
        { id: 'date', label: 'Request Date', defaultChecked: true },
        { id: 'id', label: 'Settlement ID', defaultChecked: true },
        { id: 'name', label: 'Ambassador Name', defaultChecked: true },
        { id: 'mobile', label: 'Mobile', defaultChecked: true },
        { id: 'role', label: 'Role', defaultChecked: true },
        { id: 'amount', label: 'Amount', defaultChecked: true },
        { id: 'status', label: 'Status', defaultChecked: true },
        { id: 'payoutDate', label: 'Payout Date', defaultChecked: true },
        { id: 'bankRef', label: 'Bank Reference', defaultChecked: true },
        { id: 'bankName', label: 'Bank Name', defaultChecked: true },
        { id: 'accountNumber', label: 'Account Number', defaultChecked: true },
        { id: 'ifscCode', label: 'IFSC Code', defaultChecked: true },
        { id: 'remarks', label: 'Remarks', defaultChecked: true }
    ]

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">Settlements</h3>
                <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                        <div className="flex items-center gap-2 mr-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl">
                            <span className="text-xs font-bold text-blue-700">{selectedIds.length} Selected</span>
                            <button
                                onClick={handleBulkExportSelected}
                                title="Export Selected for Bank"
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            >
                                <FileDown size={14} />
                            </button>
                            <button
                                onClick={handleBulkPaySelected}
                                title="Bulk Process Selected"
                                className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                            >
                                <CheckCircle size={14} />
                            </button>
                            <button
                                onClick={() => setSelectedIds([])}
                                className="text-[10px] text-blue-400 hover:text-blue-600 underline ml-1"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                    <button
                        onClick={() => {
                            fileInputRef.current?.click()
                        }}
                        disabled={isUploading}
                        suppressHydrationWarning={true}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-all shadow-lg shadow-amber-900/20 disabled:opacity-50"
                        title="Import & Sync Past Data"
                    >
                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                        Import & Sync Past Data
                    </button>

                    <button
                        onClick={handleDownloadTemplate}
                        suppressHydrationWarning={true}
                        className="p-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all border border-gray-200"
                        title="Download CSV Template"
                    >
                        <FileDown size={14} />
                    </button>

                    <button
                        onClick={() => setShowExportModal(true)}
                        suppressHydrationWarning={true}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl text-xs font-bold hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <FileDown size={14} />
                        Export All
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".csv"
                        onChange={handleFileUpload}
                    />
                </div>
            </div>

            <div className="bg-white p-2 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <DataTable
                    data={data.filter(s => s.status === 'Pending')}
                    columns={columns as any}
                    searchKey={["user.fullName", "user.mobileNumber"] as any}
                    searchPlaceholder="Search by name or mobile..."
                    pageSize={10}
                    enableMultiSelection={true}
                    onSelectionChange={(items) => {
                        setSelectedIds(items.map((i: any) => i.id))
                    }}
                    uniqueKey="id"
                />
            </div>

            <PaymentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                settlement={selectedSettlement}
                selectedIds={selectedSettlement?.id === -1 ? selectedIds : undefined}
                onSuccess={() => {
                    setSelectedIds([])
                    toast.success("Payment processed successfully")
                    router.refresh()
                }}
            />

            <ExportDateRangeModal
                isOpen={showExportModal}
                onClose={() => setShowExportModal(false)}
                onExport={handleServerExport}
                title="Export Payouts"
                showStatusFilter={true}
                columns={exportColumns}
            />

            <ConfirmDialog
                isOpen={showAlert}
                title={alertConfig.title}
                description={alertConfig.description}
                confirmText="Got it"
                onConfirm={() => setShowAlert(false)}
                onCancel={() => setShowAlert(false)}
                variant="info"
            />

            <ConfirmDialog
                isOpen={showBulkConfirm}
                title={syncMode === 'mobile' ? "Confirm Past Payout Sync" : "Confirm Bulk Payouts"}
                description={syncMode === 'mobile'
                    ? `Found ${pastPayoutsToSync.length} records to sync by Mobile Number. This will mark them as PAID immediately. Proceed?`
                    : `Found ${pendingPayoutsToProcess.length} valid records to process by Mobile Number. Are you sure you want to proceed?`
                }
                confirmText={syncMode === 'mobile' ? "Sync Now" : "Proceed Bulk"}
                onConfirm={confirmBulkProcess}
                onCancel={() => {
                    setShowBulkConfirm(false)
                    setIsUploading(false)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                variant="warning"
            />
        </div>
    )
}
