'use client'

import { useState } from 'react'
import { Trash2, CheckCircle, XCircle, Clock, ShieldAlert } from 'lucide-react'
import { PremiumCard } from '@/components/premium/PremiumCard'
import { approveDeletion, rejectDeletion } from '@/app/deletion-actions'
import { toast } from 'sonner'

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

    const handleApprove = async (userId: number) => {
        if (!confirm('Are you sure you want to PERMANENTLY scrub this user\'s data? This cannot be undone.')) return

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

    if (requests.length === 0) {
        return (
            <PremiumCard>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="text-gray-300" size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">No Pending Requests</h3>
                    <p className="text-gray-500 text-sm max-w-xs mt-1">
                        There are no accounts currently queued for deletion.
                    </p>
                </div>
            </PremiumCard>
        )
    }

    return (
        <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex gap-3 items-start">
                <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div>
                    <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Compliance Critical</h4>
                    <p className="text-xs text-amber-700 font-medium leading-relaxed mt-1">
                        Google Play requires that we process account deletion requests promptly. Approving a request will scrub all PII (Personally Identifiable Information) while maintaining referential integrity for financial records.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-bottom border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User Details</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Requested On</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Age</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {requests.map((request) => (
                                <tr key={request.userId} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center font-black text-sm">
                                                {request.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{request.fullName}</p>
                                                <p className="text-xs text-gray-500 font-medium">{request.mobileNumber} • {request.role}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Clock size={14} className="text-amber-500" />
                                            <span className="text-xs font-bold">
                                                {new Date(request.deletionRequestedAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-xs font-medium text-gray-500">
                                        Joined {new Date(request.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-5">
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
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
