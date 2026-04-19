import { getMyReferrals } from '@/app/referral-actions'
import { getCurrentUser } from '@/lib/auth-service'
import { getBenefitSlabs } from '@/app/benefit-actions'
import prisma from '@/lib/prisma'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { ReferralsList } from './referrals-list'

export default async function ReferralsPage() {
    const [referrals, user, slabsResult, activeYears, settlements] = await Promise.all([
        getMyReferrals(),
        getCurrentUser(),
        getBenefitSlabs(),
        prisma.academicYear.findMany({ where: { isActive: true } }),
        prisma.settlement.findMany({
            where: { userId: (await getCurrentUser())?.userId },
            include: { referralLead: true }
        })
    ])

    // Prepare Campus Fee Map for accurate yield calculations (mirroring DashboardClient)
    const activeYearStrings = activeYears.map(y => y.year)
    const campusIds = Array.from(new Set(referrals.map((r: any) => r.campusId).filter(Boolean))) as number[]
    const grade1Fees = await prisma.gradeFee.findMany({
        where: {
            campusId: { in: campusIds },
            grade: { in: ['Grade 1', 'Grade - 1', '1', 'I'] },
            academicYear: { in: activeYearStrings }
        }
    })
    const campusFeeMap: Record<string, Record<number, { otp: number, wotp: number }>> = {}
    activeYearStrings.forEach(y => { campusFeeMap[y] = {} })
    grade1Fees.forEach(gf => {
        if (!campusFeeMap[gf.academicYear]) campusFeeMap[gf.academicYear] = {}
        campusFeeMap[gf.academicYear][gf.campusId] = {
            otp: gf.annualFee_otp || 0,
            wotp: gf.annualFee_wotp || 0
        }
    })

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
                    settlements={settlements}
                    campusFeeMap={campusFeeMap}
                />
            </div>
        </div>
    )
}
