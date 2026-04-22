import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import { DailyLeaderboardWarRoom } from '@/components/campus/DailyLeaderboardWarRoom'
import { Trophy, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function LeaderboardPage() {
    const user = await getCurrentUser()
    if (!user) redirect('/')

    // Only admins should see the war room
    const isAdmin = user.role === 'Super Admin' || user.role === 'Finance Admin' || user.role.includes('Admin') || user.role.includes('Campus')
    if (!isAdmin) redirect('/dashboard')

    return (
        <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-[1600px] mx-auto space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <Link 
                            href="/campus" 
                            className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                <Trophy className="text-amber-500" size={32} />
                                HOC APP DRIVE 2026
                            </h1>
                            <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">
                                Daily Leaderboard War Room
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2">
                            <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                            <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Live Updates Active</span>
                        </div>
                    </div>
                </div>

                {/* The War Room Component */}
                <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
                    <DailyLeaderboardWarRoom />
                </div>

                {/* Footer / Context */}
                <div className="bg-gray-900 text-white p-8 rounded-3xl shadow-xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div>
                            <h3 className="text-amber-400 font-black uppercase tracking-widest text-xs mb-3">Goal of the Drive</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                This competition is designed to accelerate referrals and admissions across all Achariya branches. Success depends on branch synergy and star ambassador engagement.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-amber-400 font-black uppercase tracking-widest text-xs mb-3">Tracking Metric</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                Data is pulled real-time from the Referral Pipeline. Confirmation counts are updated as admissions officers process applications.
                            </p>
                        </div>
                        <div>
                            <h3 className="text-amber-400 font-black uppercase tracking-widest text-xs mb-3">Need Support?</h3>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                If your branch is in the "Red Zone," contact the Central Outreach Team immediately for localized marketing support and tools.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
