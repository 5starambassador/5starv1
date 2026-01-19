import { useState, useRef } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { PaymentModal } from './PaymentModal'
import { CheckCircle, Clock, Download, Upload, Loader2, FileDown } from 'lucide-react'
import { exportToCSV } from '@/lib/export-utils'

import { format } from 'date-fns'
import { processBulkPayouts } from '@/app/finance-actions'
import { toast } from 'sonner'
import { exportPayouts } from '@/app/export-actions'
import { ExportDateRangeModal } from './ExportDateRangeModal'

interface Settlement {
    id: number
    amount: number
    status: 'Pending' | 'Processed'
    createdAt: string | Date
    payoutDate: string | Date | null
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
    const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [showExportModal, setShowExportModal] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Export for Bank Processing
    const handleBankExport = () => {
        const pendingPayouts = data.filter(s => s.status === 'Pending')
        if (pendingPayouts.length === 0) {
            alert("No pending payouts to export.")
            return
        }

        // Expanded Headers for better bank processing compatibility
        const headers = ['Beneficiary Name,Mobile,Bank Name,Account Number,IFSC Code,Amount,Ref ID,Date,Bank Transaction Ref']
        const rows = pendingPayouts.map(s => {
            // Clean strings for CSV
            const name = s.user.fullName.replace(/,/g, ' ')

            // Prefer structured data
            let bankName = (s.user.bankName || 'N/A').replace(/,/g, ' ')
            let accNo = (s.user.accountNumber || 'N/A').replace(/,/g, ' ')
            let ifsc = (s.user.ifscCode || 'N/A').replace(/,/g, ' ')

            // Fallback: If structured data missing but legacy string exists, try to use it or just dump it in bankName
            if ((!s.user.bankName || !s.user.accountNumber) && s.user.bankAccountDetails && s.user.bankAccountDetails !== 'N/A') {
                // If we only have the blob string, put it in Bank Name for awareness, or leave split fields empty
                bankName = s.user.bankAccountDetails.replace(/,/g, ';')
                accNo = ''
                ifsc = ''
            }

            return `${name},${s.user.mobileNumber},${bankName},${accNo},${ifsc},${s.amount},${s.id},${format(new Date(s.createdAt), 'yyyy-MM-dd')},`
        })

        const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n")
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `Payout_Batch_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleDownloadTemplate = () => {
        const headers = ['Beneficiary Name,Mobile,Bank Details,Amount,Ref ID,Date,Bank Transaction Ref']
        // Add a sample row to guide the user
        const sampleRow = 'John Doe,9876543210,"Bank Name; Acc: 123456789; IFSC: ABCD0001234",1500,101,2026-01-01,'

        const csvContent = "data:text/csv;charset=utf-8," + [headers, sampleRow].join("\n")
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", "Payout_Upload_Template.csv")
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
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

                // Skip header logic: Assume header exists.
                // Headers: Name,Mobile,Bank,Amount,Ref ID,Date,Bank Transaction Ref
                // Index: 4 = Ref ID (Settlement ID), 6 = Transaction Ref

                const payoutsToProcess: { id: number, transactionId: string }[] = []

                // Start from index 1 to skip header
                for (let i = 1; i < rows.length; i++) {
                    const cols = rows[i].split(',')
                    // Basic check to ensure row has enough columns
                    if (cols.length < 5) continue

                    const id = parseInt(cols[4]?.trim())
                    // Transaction ID is typically the last column we added empty in export
                    // but in upload, we expect it to be filled.
                    // Let's assume user fills the LAST column or the column named 'Bank Transaction Ref' (index 6)
                    const txnId = cols[6]?.trim() || cols[cols.length - 1]?.trim()

                    if (!isNaN(id) && txnId && txnId.length > 3) {
                        payoutsToProcess.push({ id, transactionId: txnId })
                    }
                }

                if (payoutsToProcess.length === 0) {
                    toast.error("No valid rows found. Ensure 'Ref ID' and 'Bank Transaction Ref' are present.")
                    setIsUploading(false)
                    return
                }

                if (!confirm(`Found ${payoutsToProcess.length} valid records to process. Proceed?`)) {
                    setIsUploading(false)
                    return
                }

                const res = await processBulkPayouts(payoutsToProcess)
                if (res.success) {
                    toast.success(res.message)
                } else {
                    toast.error(res.error)
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

    const columns = [
        {
            header: 'Ambassador',
            accessorKey: 'user.fullName',
            sortable: true,
            filterable: true,
            cell: (row: Settlement) => (
                <div>
                    <div className="font-bold text-gray-900 dark:text-white">{row.user.fullName}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{row.user.role} • {row.user.mobileNumber}</div>
                </div>
            )
        },
        {
            header: 'Bank Details',
            accessorKey: 'user.bankName', // loose accessor for sort, mostly visual
            cell: (row: Settlement) => (
                <div className="max-w-[150px] text-xs">
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
            cell: (row: Settlement) => <span className="font-bold font-mono text-primary-red dark:text-red-400">₹{row.amount.toLocaleString()}</span>
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
            cell: (row: Settlement) => format(new Date(row.createdAt), 'dd MMM yyyy')
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
            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob)
                link.setAttribute('href', url)
                link.setAttribute('download', res.filename || 'payouts.csv')
                link.style.visibility = 'hidden'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
            }
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
        { id: 'bankDetails', label: 'Bank Details', defaultChecked: true },
        { id: 'remarks', label: 'Remarks', defaultChecked: true }
    ]

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
                <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">Settlements</h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        suppressHydrationWarning={true}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-900/20 disabled:opacity-50"
                    >
                        {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                        Import Payouts
                    </button>
                    {/* Template Download (Small icon button or text) */}
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
                    data={data}
                    columns={columns as any}
                    searchKey={"user.fullName" as any}
                    searchPlaceholder="Search ambassador..."
                    pageSize={10}
                />
            </div>

            <PaymentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                settlement={selectedSettlement}
                onSuccess={() => {
                    // Server action revalidates the path
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
        </div>
    )
}
