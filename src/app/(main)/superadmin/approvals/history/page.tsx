import { Suspense } from 'react'
import { getRejectedPayments } from '@/app/payment-approval-actions'
import { RejectedPaymentsTable } from './RejectedPaymentsTable'
import { ArrowLeft, History } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function RejectionHistoryPage(props: { searchParams: Promise<{ search?: string }> }) {
    const searchParams = await props.searchParams
    const search = searchParams.search

    const response = await getRejectedPayments(search)
    const payments = response.success ? response.data : []

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/superadmin/approvals"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Rejection History</h1>
                            <div className="p-1 px-2 bg-red-50 text-red-600 rounded-md text-[10px] font-bold uppercase tracking-wider border border-red-100">
                                History
                            </div>
                        </div>
                        <p className="text-gray-500 mt-1">Review previously rejected payment submissions and reasons.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <Suspense fallback={<div className="p-12 text-center text-gray-500">Loading history...</div>}>
                    <RejectedPaymentsTable payments={payments as any} />
                </Suspense>
            </div>
        </div>
    )
}
