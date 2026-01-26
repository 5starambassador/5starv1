import prisma from '@/lib/prisma'
import { ApprovalActions } from './ApprovalActions'
import { format } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function ApprovalsPage() {
    const pendingPayments = await prisma.payment.findMany({
        where: {
            // Check for both legacy and new status conventions to be safe
            OR: [
                { orderStatus: 'PENDING_APPROVAL' },
                { paymentStatus: 'Pending Approval' }
            ],
            paymentMethod: 'MANUAL_QR'
        },
        include: {
            user: {
                select: { fullName: true, mobileNumber: true, email: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    })

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Payment Verification</h1>
                    <p className="text-gray-500 mt-2">Approve manual QR code payments. Verify UTR with your bank statement first.</p>
                </div>
                <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-mono text-sm font-bold border border-blue-100">
                    Pending: {pendingPayments.length}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                {pendingPayments.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <p className="text-lg font-medium">No pending payments found</p>
                        <p className="text-sm mt-1">All manual transactions have been processed.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 border-b border-gray-100 uppercase text-xs font-bold text-gray-500 tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">User Details</th>
                                    <th className="px-6 py-4">Transaction UTR</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {pendingPayments.map((payment) => (
                                    <tr key={payment.orderId} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                                            {format(new Date(payment.createdAt), 'dd MMM, hh:mm a')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-bold text-gray-900">{payment.user.fullName}</p>
                                                <p className="text-xs text-gray-500">{payment.user.mobileNumber}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-800 font-mono text-sm font-medium border border-gray-200">
                                                {payment.transactionId}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-bold text-emerald-600">₹{payment.orderAmount}</span>
                                        </td>
                                        <td className="px-6 py-4 flex justify-center">
                                            <ApprovalActions orderId={payment.orderId} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
