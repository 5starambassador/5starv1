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
                        <PaymentButton
                            amount={amount}
                            userId={user.userId}
                        />
                    )}

                    <p className="text-xs text-center text-gray-500 mt-4">
                        If you face any issues, please contact support.
                    </p>
                </div>
            </div>
        </div>
    )
}
