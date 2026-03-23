import { Suspense } from 'react'
import prisma from '@/lib/prisma'
import { PaymentApprovalTable } from './PaymentApprovalTable'
import { format } from 'date-fns'
import { getCurrentUser } from '@/lib/auth-service'
import { hasPermission } from '@/lib/permission-service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { History } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ApprovalsPage(props: { searchParams: Promise<{ page?: string, limit?: string, search?: string }> }) {
    const searchParams = await props.searchParams
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const hasAccess = await hasPermission('paymentApproval')
    if (!hasAccess) redirect('/dashboard')

    const page = Number(searchParams.page) || 1
    const limit = Number(searchParams.limit) || 50
    const skip = (page - 1) * limit
    const search = searchParams.search

    const where: any = {
        AND: [
            {
                OR: [
                    { orderStatus: 'PENDING_APPROVAL' },
                    { paymentStatus: 'Pending Approval' }
                ]
            },
            { paymentMethod: 'MANUAL_QR' }
        ]
    }

    if (search) {
        where.AND.push({
            OR: [
                { transactionId: { contains: search, mode: 'insensitive' } },
                { user: { fullName: { contains: search, mode: 'insensitive' } } },
                { user: { mobileNumber: { contains: search, mode: 'insensitive' } } }
            ]
        })
    }

    const [allPayments, totalCount, pendingCount] = await Promise.all([
        prisma.payment.findMany({
            where,
            include: {
                user: {
                    select: { fullName: true, mobileNumber: true, email: true }
                }
            },
            take: limit,
            skip: skip,
            orderBy: { createdAt: 'desc' }
        }),
        prisma.payment.count({ where }),
        prisma.payment.count({
            where: {
                orderStatus: 'PENDING_APPROVAL',
                paymentMethod: 'MANUAL_QR'
            }
        })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Payment Verification</h1>
                    <p className="text-gray-500 mt-2">Approve manual QR code payments. Verify UTR with your bank statement first.</p>
                </div>
                <div className="flex gap-4 items-center">
                    <Link
                        href="/superadmin/approvals/history"
                        className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 rounded-lg text-sm font-bold border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <History size={16} />
                        View History
                    </Link>
                    <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-mono text-sm font-bold border border-blue-100">
                        Pending: {pendingCount}
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <Suspense fallback={<div className="p-12 text-center text-gray-500">Loading...</div>}>
                    <PaymentApprovalTable
                        initialPayments={allPayments}
                        page={page}
                        totalPages={totalPages}
                        totalCount={totalCount}
                    />
                </Suspense>
            </div>
        </div>
    )
}
