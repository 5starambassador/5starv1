import { getMyReferrals } from '@/app/referral-actions'
import { getCurrentUser } from '@/lib/auth-service'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { ScrollLock } from '@/components/ui/ScrollLock'
import { ReferralsList } from './referrals-list'

export default async function ReferralsPage() {
    const referrals = await getMyReferrals()

    return (
        <div className="fixed inset-0 w-full h-full overflow-y-auto bg-[#0f172a] font-[family-name:var(--font-outfit)] pb-32 z-[100] overscroll-y-contain">
            <ScrollLock />

            <div className="absolute inset-0 bg-[#0f172a] -z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/40 via-slate-900/60 to-slate-900 z-0 opacity-100" />
            </div>

            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] right-[-10%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-pink-600/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-2xl mx-auto min-h-[100dvh] flex flex-col p-6">
                <div className="w-full h-20 shrink-0" />

                <header className="flex items-center justify-between mb-8 pt-4">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                            <ChevronLeft size={20} className="text-white/80" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-white">My Referrals</h1>
                            <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Your Referrals</p>
                        </div>
                    </div>
                </header>

                <ReferralsList referrals={referrals} />
            </div>
        </div>
    )
}
