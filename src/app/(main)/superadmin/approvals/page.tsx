import { Suspense } from 'react'
import prisma from '@/lib/prisma'
import { PaymentApprovalTable } from './PaymentApprovalTable'
import { format } from 'date-fns'
import { getCurrentUser } from '@/lib/auth-service'
import { hasModuleAccess } from '@/lib/permissions'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function ApprovalsPage(props: { searchParams: Promise<{ page?: string, limit?: string, search?: string }> }) {
    const searchParams = await props.searchParams
    const user = await getCurrentUser()
    if (!user) redirect('/login')

    const hasAccess = hasModuleAccess(user.role, 'paymentApproval')
    if (!hasAccess) redirect('/dashboard')

    const page = Number(searchParams.page) || 1
    const limit = Number(searchParams.limit) || 50
    const skip = (page - 1) * limit
    const search = searchParams.search

    // Base Where Clause
    const where: any = {
        AND: [
            {
                OR: [
                    { orderStatus: 'PENDING_APPROVAL' },
                    { paymentStatus: 'Pending Approval' },
                    { orderStatus: 'FAILED' }, // Show recent failures too
                    { paymentStatus: 'Rejected by Admin' }
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

    const [allPayments, totalCount] = await Promise.all([
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
        prisma.payment.count({ where })
    ])

    const totalPages = Math.ceil(totalCount / limit)
    const pendingCount = await prisma.payment.count({
        where: {
            orderStatus: 'PENDING_APPROVAL',
            paymentMethod: 'MANUAL_QR'
        }
    })

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Payment Verification</h1>
                    <p className="text-gray-500 mt-2">Approve manual QR code payments. Verify UTR with your bank statement first.</p>
                </div>
                <div className="flex gap-4">
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
