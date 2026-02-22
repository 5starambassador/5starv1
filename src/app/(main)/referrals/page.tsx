import { getMyReferrals } from '@/app/referral-actions'
import { getCurrentUser } from '@/lib/auth-service'
import { getBenefitSlabs } from '@/app/benefit-actions'
import prisma from '@/lib/prisma'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { ReferralsList } from './referrals-list'

export default async function ReferralsPage() {
    const [referrals, user, slabsResult, activeYears] = await Promise.all([
        getMyReferrals(),
        getCurrentUser(),
        getBenefitSlabs(),
        prisma.academicYear.findMany({ where: { isActive: true } })
    ])

    return (
        <div className="relative">
            <div className="max-w-4xl mx-auto flex flex-col">
                <header className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="group w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-blue-600/20 hover:border-blue-500/30 transition-all">
                            <ChevronLeft size={20} className="text-white/80 group-hover:text-white" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-white uppercase italic">My Referrals</h1>
                            <p className="text-[10px] text-blue-200/40 font-black uppercase tracking-[0.2em] mt-1">Your Royal Network</p>
                        </div>
                    </div>
                </header>

                <ReferralsList
                    referrals={referrals}
                    user={user}
                    slabs={slabsResult.success ? (slabsResult.data || []) : []}
                    activeYears={activeYears}
                />
            </div>
        </div>
    )
}
