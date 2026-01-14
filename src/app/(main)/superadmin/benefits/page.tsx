import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import { getBenefitSlabs } from '@/app/benefit-actions'
import { BenefitManagement } from '@/components/superadmin/BenefitManagement'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function BenefitsPage() {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Super Admin') redirect('/dashboard')

    const { success, data } = await getBenefitSlabs()
    const slabs = success && data ? data : []

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center gap-4">
                <Link href="/superadmin" className="p-2 bg-white rounded-full shadow-sm hover:shadow-md transition-all text-gray-600">
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Benefit Management</h1>
                    <p className="text-gray-500">Configure referral incentive tiers and verify payouts.</p>
                </div>
            </div>

            <BenefitManagement initialSlabs={slabs} />
        </div>
    )
}
