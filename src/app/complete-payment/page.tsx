import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import PaymentButton from '@/components/payment/PaymentButton'

export default async function CompletePaymentPage() {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/')
    }

    if ((user as any).paymentStatus === 'Success') {
        redirect('/dashboard')
    }

    const isPendingApproval = (user as any).paymentStatus === 'Pending Approval';
    const isRejected = (user as any).paymentStatus === 'Rejected';

    // Fetch latest rejection reason if rejected
    let rejectionReason = null
    if (isRejected) {
        const prisma = (await import('@/lib/prisma')).default
        const lastPayment = await prisma.payment.findFirst({
            where: { userId: user.userId, orderStatus: 'FAILED' },
            orderBy: { createdAt: 'desc' }
        })
        rejectionReason = (lastPayment as any)?.adminRemarks
    }

    // Default registration fee
    const amount = 25

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md shadow-xl bg-white rounded-xl overflow-hidden border border-gray-100">
                <div className="p-6 text-center border-b border-gray-100">
                    <h2 className="text-2xl font-bold text-amber-600">Complete Registration</h2>
                    <p className="text-slate-500 mt-2">
                        Complete your payment to activate your account.
                    </p>
                </div>
                <div className="p-6 space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                        <p className="font-medium">User: {user.fullName}</p>
                        <p>Mobile: {user.mobileNumber}</p>
                        {!isPendingApproval && <p className="mt-2 text-lg font-bold">Amount Due: ₹{amount}</p>}
                    </div>

                    {isRejected && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-start gap-3">
                                <div className="p-2 bg-red-100 rounded-lg text-red-600">
                                    <svg xmlns="http://www.w3.org/2001/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-red-900">Payment Rejected</p>
                                    <p className="text-xs text-red-700 mt-1">
                                        Reason: <span className="font-semibold italic">"{rejectionReason || 'Details provided by Finance Team'}"</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {isPendingApproval ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2 text-amber-600">
                                <span className="text-2xl font-bold">...</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Payment Pending Approval</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                We have received your payment proof (UTR). Your account will be activated once the Finance Team verifies the transaction.
                            </p>
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Status</p>
                                <p className="text-sm font-semibold text-amber-600">Admin Verification in Progress</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {isRejected && (
                                <p className="text-center text-xs text-slate-500 font-medium">Please review the reason above and resubmit with correct details.</p>
                            )}
                            <PaymentButton
                                amount={amount}
                                userId={user.userId}
                            />
                        </div>
                    )}

                    <p className="text-xs text-center text-gray-500 mt-4">
                        If you face any issues, please contact support.
                    </p>
                </div>
            </div>
        </div>
    )
}
