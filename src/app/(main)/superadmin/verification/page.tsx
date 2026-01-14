import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import VerificationQueue from '@/components/superadmin/VerificationQueue'

export default async function VerificationPage() {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Super Admin') redirect('/dashboard')

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                        Beneficiary Verification Queue
                    </h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">
                        Verify child details for staff and parents to activate reduced fee benefits.
                    </p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <VerificationQueue />
            </div>
        </div>
    )
}
