'use client'

import { useState } from 'react'
import { Trash2, CheckCircle, XCircle, Clock, ShieldAlert, Download } from 'lucide-react'

import { approveDeletion, rejectDeletion } from '@/app/deletion-actions'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DataTable } from '@/components/ui/DataTable'
import { exportToCSV } from '@/lib/export-utils'

interface DeletionRequest {
    userId: number
    fullName: string
    mobileNumber: string
    role: string
    deletionRequestedAt: string
    referralCode: string
    createdAt: string
}

interface Props {
    requests: DeletionRequest[]
    onRefresh: () => void
}

export function DeletionRequestsTable({ requests, onRefresh }: Props) {
    const [loadingId, setLoadingId] = useState<number | null>(null)

    // Confirmation State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean
        data?: number
    }>({
        isOpen: false
    })

    const handleApprove = (userId: number) => {
        setConfirmState({ isOpen: true, data: userId })
    }

    const executeApprove = async () => {
        const userId = confirmState.data
        if (!userId) return

        setConfirmState({ isOpen: false })
        setLoadingId(userId)

        const res = await approveDeletion(userId)
        setLoadingId(null)

        if (res.success) {
            toast.success('User account deleted and data scrubbed.')
            onRefresh()
        } else {
            toast.error(res.error || 'Failed to approve deletion')
        }
    }

    const handleReject = async (userId: number) => {
        setLoadingId(userId)
        const res = await rejectDeletion(userId)
        setLoadingId(null)

        if (res.success) {
            toast.success('Deletion request rejected. Account restored to Active.')
            onRefresh()
        } else {
            toast.error(res.error || 'Failed to reject deletion')
        }
    }

    const columns = [
        {
            header: 'User Details',
            accessorKey: 'fullName',
            sortable: true,
            filterable: true,
            cell: (request: DeletionRequest) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-black text-sm">
                        {request.fullName.charAt(0)}
                    </div>
                    <div>
                        <p className="font-bold text-gray-900 text-sm">{request.fullName}</p>
                        <p className="text-xs text-gray-500 font-medium">{request.mobileNumber} • {request.role}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Requested On',
            accessorKey: 'deletionRequestedAt',
            sortable: true,
            cell: (request: DeletionRequest) => (
                <div className="flex items-center gap-2 text-gray-600">
                    <Clock size={14} className="text-amber-500" />
                    <span className="text-xs font-bold">
                        {new Date(request.deletionRequestedAt).toLocaleDateString()}
                    </span>
                </div>
            )
        },
        {
            header: 'Account Age',
            accessorKey: 'createdAt',
            cell: (request: DeletionRequest) => (
                <span className="text-xs font-medium text-gray-500">
                    Joined {new Date(request.createdAt).toLocaleDateString()}
                </span>
            )
        },
        {
            header: 'Actions',
            accessorKey: (r: DeletionRequest) => r.userId,
            cell: (request: DeletionRequest) => (
                <div className="flex justify-end gap-2">
                    <button
                        onClick={() => handleReject(request.userId)}
                        disabled={loadingId !== null}
                        className="p-2 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-lg transition-colors"
                        title="Reject Request"
                    >
                        <XCircle size={18} />
                    </button>
                    <button
                        onClick={() => handleApprove(request.userId)}
                        disabled={loadingId !== null}
                        className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                    >
                        {loadingId === request.userId ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Trash2 size={14} />
                        )}
                        Confirm Deletion
                    </button>
                </div>
            )
        }
    ]

    if (requests.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12">
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="text-gray-300" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No Pending Requests</h3>
                    <p className="text-gray-500 text-sm max-w-xs mt-1">
                        There are no accounts currently queued for deletion.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-start gap-4">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 items-start flex-1">
                    <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
                    <div>
                        <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Compliance Critical</h4>
                        <p className="text-xs text-amber-700 font-medium leading-relaxed mt-1">
                            Google Play requires that we process account deletion requests promptly. Approving a request will scrub all PII (Personally Identifiable Information) while maintaining referential integrity for financial records.
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => exportToCSV(requests, 'Deletion_Requests', [
                        { header: 'Name', accessor: (r) => r.fullName },
                        { header: 'Mobile', accessor: (r) => r.mobileNumber },
                        { header: 'Role', accessor: (r) => r.role },
                        { header: 'Requested At', accessor: (r) => r.deletionRequestedAt },
                        { header: 'Joined At', accessor: (r) => r.createdAt }
                    ])}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-xs hover:bg-gray-50 transition-all flex items-center gap-2 shrink-0 h-fit mt-1"
                >
                    <Download size={14} /> Export List
                </button>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto pb-4">
                    <DataTable
                        data={requests}
                        columns={columns as any}
                        pageSize={10}
                        searchKey={['fullName', 'mobileNumber']}
                        searchPlaceholder="Search deletion requests..."
                    />
                </div>
            </div>

            {/* Premium Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title="Permanent Account Deletion"
                description={
                    <p className="text-red-600 font-medium">
                        Are you sure you want to <strong>PERMANENTLY scrub</strong> this user's data?
                        <br />This action cannot be undone and is irreversible.
                    </p>
                }
                confirmText="Confirm Deletion"
                variant="danger"
                onConfirm={executeApprove}
                onCancel={() => setConfirmState({ isOpen: false })}
            />
        </div>
    )
}
