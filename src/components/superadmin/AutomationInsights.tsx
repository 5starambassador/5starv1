'use client'

import React from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from 'recharts'
import { WhatsAppAnalytics } from '@/app/automation-actions'
import { MessageSquare, ThumbsUp, AlertCircle, TrendingUp, Zap } from 'lucide-react'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b']

interface AutomationInsightsProps {
    data: WhatsAppAnalytics
}

export default function AutomationInsights({ data }: AutomationInsightsProps) {
    if (!data || data.totalSent === 0) {
        return (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                    <Zap className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Automation Fueling Up 🚀</h3>
                <p className="text-slate-500 max-w-xs text-sm">
                    Automation logs will appear here once the system starts sending nudges and handling chatbot queries.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                    label="Total Messages"
                    value={data.totalSent.toLocaleString()}
                    icon={<MessageSquare className="h-5 w-5 text-indigo-500" />}
                    color="indigo"
                />
                <StatCard
                    label="Success Rate"
                    value={`${data.successRate}%`}
                    icon={<ThumbsUp className="h-5 w-5 text-emerald-500" />}
                    color="emerald"
                />
                <StatCard
                    label="Chatbot Queries"
                    value={data.chatbotVolume.toLocaleString()}
                    icon={<Zap className="h-5 w-5 text-amber-500" />}
                    color="amber"
                />
                <StatCard
                    label="Failures"
                    value={data.failureCount.toLocaleString()}
                    icon={<AlertCircle className="h-5 w-5 text-rose-500" />}
                    color="rose"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Communication Volume</h3>
                            <p className="text-xs text-slate-400 font-medium">Daily outbound automation & chatbot logs</p>
                        </div>
                        <div className="h-8 w-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-indigo-600" />
                        </div>
                    </div>
                    <div className="h-64 mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.recentTrends}>
                                <defs>
                                    <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis
                                    dataKey="date"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: '16px',
                                        border: 'none',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        fontSize: '12px'
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="sent"
                                    stroke="#6366f1"
                                    strokeWidth={3}
                                    fillOpacity={1}
                                    fill="url(#colorSent)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="chatbot"
                                    stroke="#8b5cf6"
                                    strokeWidth={2}
                                    fill="none"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Distribution Chart */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                    <h3 className="text-base font-black text-slate-800 uppercase tracking-wider mb-6">Category Split</h3>
                    <div className="h-48">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.distribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.distribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 space-y-2">
                        {data.distribution.map((item, index) => (
                            <div key={item.name} className="flex items-center justify-between text-xs font-medium">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                    <span className="text-slate-600 uppercase tracking-tighter">{item.name}</span>
                                </div>
                                <span className="text-slate-800 font-bold">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({ label, value, icon, color }: { label: string, value: string, icon: React.ReactNode, color: string }) {
    const colorClasses: Record<string, string> = {
        indigo: "bg-indigo-50 border-indigo-100",
        emerald: "bg-emerald-50 border-emerald-100",
        amber: "bg-amber-50 border-amber-100",
        rose: "bg-rose-50 border-rose-100",
    }

    return (
        <div className={`bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex items-center gap-4`}>
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center border ${colorClasses[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
                <p className="text-xl font-black text-slate-800">{value}</p>
            </div>
        </div>
    )
}
