'use client'

import { Trophy, Zap, Star, AlertTriangle, TrendingUp, Users, Target, Rocket } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getDailyLeaderboardStats } from '@/app/actions/campus-dashboard-actions'
import { toast } from 'sonner'
import * as htmlToImage from 'html-to-image'


export function DailyLeaderboardWarRoom() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            const res = await getDailyLeaderboardStats()
            if (res.success) {
                setData(res.data)
            } else {
                toast.error(res.error || 'Failed to load leaderboard')
            }
            setLoading(false)
        }
        fetchData()
        
        // Auto refresh every 5 minutes for "Live" feel
        const interval = setInterval(fetchData, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    const handleDownloadImage = async () => {
        const element = document.getElementById('war-room-container')
        if (!element) return

        const tid = toast.loading('Generating high-quality image...')
        try {
            // Give a small delay to ensure everything is rendered
            await new Promise(resolve => setTimeout(resolve, 500))
            
            const dataUrl = await htmlToImage.toPng(element, {
                quality: 1,
                pixelRatio: 2, // High DPI for better quality
                backgroundColor: '#f8fafc', // Match bg-slate-50
                skipFonts: true,
                filter: (node) => {

                    const classList = (node as any).classList
                    return !classList || !classList.contains('no-export')
                }
            })

            
            const link = document.createElement('a')
            link.download = `Achariya-War-Room-${new Date().toISOString().split('T')[0]}.png`
            link.href = dataUrl
            link.click()
            toast.success('Image downloaded successfully!', { id: tid })
        } catch (err) {
            console.error('Export Error:', err)
            toast.error('Failed to generate image', { id: tid })
        }
    }


    if (loading) {
        return (
            <div className="min-h-[400px] flex items-center justify-center bg-gray-900 rounded-[32px] border border-gray-800 animate-pulse">
                <div className="text-gray-500 font-bold tracking-widest uppercase">Initializing War Room...</div>
            </div>
        )
    }

    if (!data) return null

    const top3 = data.leaderboard.slice(0, 3)
    const rest = data.leaderboard.slice(3, 10)
    const powerMetrics = {
        highestReferrals: data.leaderboard[0],
        bestConversion: [...data.leaderboard]
            .filter((b: any) => b.admissions > 0)
            .sort((a: any, b: any) => b.conversion - a.conversion)[0] || data.leaderboard[0],
        fastestGrowth: [...data.leaderboard]
            .sort((a: any, b: any) => b.recentReferrals - a.recentReferrals)[0],
        starBranch: [...data.leaderboard]
            .sort((a: any, b: any) => (b.referrals * 0.7 + b.conversion * 0.3))[0] // Weighted score
    }


    const redZone = data.leaderboard.filter((b: any) => b.referrals < 2)

    return (
        <div className="space-y-8 animate-fade-in" id="war-room-container">
            {/* Download Action Overlay (Hidden in Capture) */}
            <div className="flex justify-end mb-4 no-export" data-html2canvas-ignore>
                <button
                    onClick={handleDownloadImage}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                >
                    <Rocket size={16} />
                    Download Shareable Image
                </button>
            </div>

            {/* Header */}

            <div className="bg-gray-900 text-white p-8 rounded-[32px] border border-gray-800 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-[100px] rounded-full -mr-20 -mt-20" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="w-3 h-3 bg-red-600 rounded-full animate-ping" />
                            <span className="text-red-500 font-black text-xs uppercase tracking-[0.3em]">Live Drive Status</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
                            HOC APP DRIVE <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-amber-500 to-yellow-400">
                                DAILY LEADERBOARD
                            </span>
                        </h1>
                        <p className="text-gray-400 font-bold mt-2 uppercase tracking-widest text-sm">
                            Date: {new Date(data.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex gap-4">
                        <div className="bg-gray-800 border border-gray-700 p-4 rounded-2xl text-center min-w-[120px]">
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Total Referrals</p>
                            <p className="text-3xl font-black text-white">{data.totalReferrals}</p>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 p-4 rounded-2xl text-center min-w-[120px]">
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Summer Camp</p>
                            <p className="text-3xl font-black text-amber-500">{data.summerCampReferrals}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top 3 Podiums */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {top3.map((branch: any, idx: number) => (
                    <div 
                        key={branch.id} 
                        className={`relative p-8 rounded-[32px] border transition-all duration-500 hover:scale-[1.02] ${
                            idx === 0 
                            ? 'bg-gradient-to-br from-amber-500 to-yellow-600 text-white shadow-[0_20px_50px_-12px_rgba(245,158,11,0.4)] border-amber-400' 
                            : idx === 1 
                            ? 'bg-white border-gray-200 shadow-xl' 
                            : 'bg-white border-gray-200 shadow-xl'
                        }`}
                    >
                        <div className={`absolute top-6 right-8 text-6xl font-black opacity-20 ${idx === 0 ? 'text-white' : 'text-gray-200'}`}>
                            {idx + 1}
                        </div>
                        <div className="relative z-10">
                            <Trophy className={`mb-4 ${idx === 0 ? 'text-yellow-200' : idx === 1 ? 'text-gray-400' : 'text-amber-600'}`} size={32} />
                            <h3 className={`text-xl font-black mb-1 ${idx === 0 ? 'text-white' : 'text-gray-900'}`}>{branch.name}</h3>
                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${idx === 0 ? 'text-amber-100' : 'text-gray-400'}`}>Referrals</p>
                                    <p className={`text-2xl font-black ${idx === 0 ? 'text-white' : 'text-gray-900'}`}>{branch.referrals}</p>
                                </div>
                                <div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${idx === 0 ? 'text-amber-100' : 'text-gray-400'}`}>Conv %</p>
                                    <p className={`text-2xl font-black ${idx === 0 ? 'text-white' : 'text-emerald-600'}`}>{Math.round(branch.conversion)}%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Rest of Leaderboard */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 bg-gray-50/50">
                    <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm flex items-center gap-2">
                        <Users size={18} className="text-gray-400" />
                        4th – 10th Position
                    </h3>
                </div>
                <div className="divide-y divide-gray-50">
                    {rest.map((branch: any, idx: number) => (
                        <div key={branch.id} className="flex items-center justify-between p-6 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-black text-gray-500">
                                    {idx + 4}
                                </span>
                                <p className="font-bold text-gray-800">{branch.name}</p>
                            </div>
                            <div className="flex items-center gap-8">
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-gray-400 uppercase">Referrals</p>
                                    <p className="font-black text-gray-900">{branch.referrals}</p>
                                </div>
                                <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-500" 
                                        style={{ width: `${Math.min(100, (branch.referrals / 10) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Power Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-[28px] text-white shadow-lg">
                    <Rocket className="text-indigo-200 mb-3" size={24} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Highest Referrals</p>
                    <p className="text-lg font-black mt-1 leading-tight">{powerMetrics.highestReferrals?.name || 'N/A'}</p>
                    <p className="text-2xl font-black mt-2">{powerMetrics.highestReferrals?.referrals || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-[28px] text-white shadow-lg">
                    <Target className="text-emerald-200 mb-3" size={24} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Best Conversion %</p>
                    <p className="text-lg font-black mt-1 leading-tight">{powerMetrics.bestConversion?.name || 'N/A'}</p>
                    <p className="text-2xl font-black mt-2">{Math.round(powerMetrics.bestConversion?.conversion || 0)}%</p>
                </div>
                <div className="bg-gradient-to-br from-amber-600 to-orange-700 p-6 rounded-[28px] text-white shadow-lg">
                    <Zap className="text-amber-200 mb-3" size={24} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-200">Fastest Growth</p>
                    <p className="text-lg font-black mt-1 leading-tight">{powerMetrics.fastestGrowth?.name || 'N/A'}</p>
                    <p className="text-2xl font-black mt-2">+{powerMetrics.fastestGrowth?.recentReferrals || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-600 to-pink-700 p-6 rounded-[28px] text-white shadow-lg">
                    <Star className="text-purple-200 mb-3" size={24} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-200">Star Ambassador Branch</p>
                    <p className="text-lg font-black mt-1 leading-tight">{powerMetrics.starBranch?.name || 'N/A'}</p>
                    <p className="text-2xl font-black mt-2">Active</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Star Performers */}
                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="font-black text-gray-900 uppercase tracking-widest text-sm flex items-center gap-2">
                            <Star size={18} className="text-amber-500 fill-amber-500" />
                            Star Performers Today
                        </h3>
                    </div>
                    <div className="p-4">
                        {data.starPerformers.map((p: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl mb-2 border border-transparent hover:border-amber-100 hover:bg-amber-50/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center font-black text-gray-700 shadow-sm">
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">{p.name}</p>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{p.branch}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-amber-600">{p.referrals}</p>
                                    <p className="text-[10px] font-black text-gray-400 uppercase">Referrals</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Red Zone Alert */}
                <div className="bg-red-50 rounded-[32px] border border-red-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-red-100 bg-red-100/50 flex items-center gap-3">
                        <div className="p-2 bg-red-600 text-white rounded-lg">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h3 className="font-black text-red-900 uppercase tracking-widest text-sm">Red Zone Alert</h3>
                            <p className="text-red-600 text-[10px] font-bold uppercase tracking-wider mt-0.5">Critical Intervention Required (Ref {"<"} 2)</p>
                        </div>
                    </div>
                    <div className="p-8">
                        {redZone.length > 0 ? (
                            <div className="space-y-4">
                                {redZone.map((branch: any) => (
                                    <div key={branch.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-red-100 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                                            <p className="font-bold text-gray-900">{branch.name}</p>
                                        </div>
                                        <div className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-black">
                                            {branch.referrals} REF TODAY
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <TrendingUp className="mx-auto text-emerald-500 mb-4" size={48} strokeWidth={1} />
                                <p className="text-gray-900 font-bold">Zero branches in Red Zone!</p>
                                <p className="text-gray-500 text-sm mt-1">Every branch has at least 2 referrals today.</p>
                            </div>
                        )}
                        <div className="mt-8 p-6 bg-white/50 rounded-2xl border border-red-100/50">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Target Tracker</h4>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs font-black mb-2">
                                        <span className="text-gray-600 uppercase">APP Drive (Today)</span>
                                        <span className="text-blue-600">{data.totalReferrals}</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, (data.totalReferrals / 50) * 100)}%` }} />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-xs font-black mb-2">
                                        <span className="text-gray-600 uppercase">Summer Camp 2026</span>
                                        <span className="text-amber-600">{data.summerCampReferrals}</span>
                                    </div>
                                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-amber-500" style={{ width: `${Math.min(100, (data.summerCampReferrals / 20) * 100)}%` }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
