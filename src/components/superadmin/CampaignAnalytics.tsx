'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Loader2, TrendingUp, Users, MessageSquare, CheckCircle2, Eye, Mail, Smartphone, Bell, RefreshCcw, AlertTriangle } from 'lucide-react'
import { getCampaignAnalytics, resetStuckCampaign } from '@/app/campaign-actions'
import { toast } from 'sonner'

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6']

export function CampaignAnalytics() {
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>(null)

    const fetchAnalytics = async () => {
        setLoading(true)
        const res = await getCampaignAnalytics()
        if (res.success) {
            setData(res.data)
        } else {
            toast.error('Failed to load analytics')
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const handleResetJob = async (id: number) => {
        const loadingToast = toast.loading('Reseting job...')
        const res = await resetStuckCampaign(id)
        toast.dismiss(loadingToast)
        if (res.success) {
            toast.success('Job reset successfully')
            fetchAnalytics()
        } else {
            toast.error('Failed to reset job')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="animate-spin text-slate-400" size={32} />
            </div>
        )
    }

    if (!data) return null

    // Process Channel Data for Pie Chart
    const channelData = data.channelStats.reduce((acc: any[], curr: any) => {
        const existing = acc.find(i => i.name === curr.channel)
        if (existing) {
            existing.value += curr._count._all
        } else {
            acc.push({ name: curr.channel, value: curr._count._all })
        }
        return acc
    }, [])

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Stuck Job Alert */}
            {data.stuckJobs?.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between gap-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-amber-900">Infrastructure Alert</p>
                            <p className="text-xs text-amber-700">{data.stuckJobs.length} Background Dispatch Job(s) appear stalled. This may affect real-time progress updates.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleResetJob(data.stuckJobs[0].id)}
                        className="px-4 py-2 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-700 transition-colors shadow-sm"
                    >
                        Force Recovery
                    </button>
                </motion.div>
            )}

            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="Total Engaged" value={channelData.reduce((a: any, b: any) => a + b.value, 0)} icon={Users} color="blue" />
                <StatCard title="WhatsApp" value={channelData.find((c: any) => c.name === 'WHATSAPP')?.value || 0} icon={MessageSquare} color="emerald" />
                <StatCard title="Email" value={channelData.find((c: any) => c.name === 'EMAIL')?.value || 0} icon={Mail} color="amber" />
                <StatCard title="Push/In-App" value={(channelData.find((c: any) => c.name === 'PUSH')?.value || 0) + (channelData.find((c: any) => c.name === 'IN_APP')?.value || 0)} icon={Bell} color="violet" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Trend Chart */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <TrendingUp size={20} className="text-slate-400" />
                            30-Day Activity Trend
                        </h3>
                        <div className="flex gap-4 text-xs font-medium">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Read</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Delivered</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-300" /> Sent</span>
                        </div>
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.trends}>
                                <defs>
                                    <linearGradient id="colorRead" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                                />
                                <Area type="monotone" dataKey="sent" stackId="1" stroke="#cbd5e1" fill="none" strokeWidth={2} />
                                <Area type="monotone" dataKey="delivered" stackId="2" stroke="#3B82F6" fill="url(#colorDelivered)" strokeWidth={2} />
                                <Area type="monotone" dataKey="read" stackId="3" stroke="#10B981" fill="url(#colorRead)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Channel Distribution */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-6">Channel Distribution</h3>
                    <div className="flex-1 min-h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={channelData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {channelData.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Activity Feed */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Eye size={20} className="text-slate-400" />
                        Recent Reads
                    </h3>
                    <button onClick={fetchAnalytics} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                        <RefreshCcw size={16} className="text-slate-400" />
                    </button>
                </div>
                <div className="space-y-4">
                    {data.recentActivity.length === 0 ? (
                        <p className="text-slate-400 text-center py-8 text-sm">No recent activity found.</p>
                    ) : (
                        data.recentActivity.map((activity: any, i: number) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.channel === 'WHATSAPP' ? 'bg-emerald-50 text-emerald-600' :
                                        activity.channel === 'EMAIL' ? 'bg-blue-50 text-blue-600' :
                                            'bg-violet-50 text-violet-600'
                                        }`}>
                                        {activity.channel === 'WHATSAPP' ? <MessageSquare size={18} /> :
                                            activity.channel === 'EMAIL' ? <Mail size={18} /> : <Bell size={18} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">{activity.name}</p>
                                        <p className="text-xs text-slate-400 flex items-center gap-1">
                                            via {activity.channel} • {activity.campaign?.name}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">Read</span>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        {new Date(activity.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, icon: Icon, color }: any) {
    const colorClasses: any = {
        blue: 'bg-blue-50 text-blue-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        violet: 'bg-violet-50 text-violet-600'
    }

    return (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                <p className="text-2xl font-black text-slate-800">{value}</p>
            </div>
        </div>
    )
}
