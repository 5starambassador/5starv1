'use client'

import React from 'react'
import { Heart, Clock, ArrowRight, Activity } from 'lucide-react'
import {
    ResponsiveContainer,
    PieChart as RePieChart,
    Pie,
    Cell,
    Tooltip as ReTooltip,
    Legend
} from 'recharts'

interface AmbassadorHealthCardProps {
    retention: {
        cohorts: any[]
        avgDaysToConfirm: string
    }
}

export function AmbassadorHealthCard({ retention }: AmbassadorHealthCardProps) {
    return (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] p-8 h-full flex flex-col">
            <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-gray-900">
                <Heart className="text-rose-500" size={24} fill="currentColor" />
                Ambassador Health & Velocity
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
                {/* Cohort Distribution */}
                <div className="flex flex-col">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 px-1">Activity Cohorts</p>
                    <div className="h-[250px] w-full flex-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={retention.cohorts}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={65}
                                    outerRadius={85}
                                    paddingAngle={8}
                                    dataKey="value"
                                >
                                    {retention.cohorts.map((entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <ReTooltip
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 900 }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: '20px' }} />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Conversion Velocity */}
                <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-6 px-1">
                        <div className="flex items-center gap-2">
                            <Clock className="text-amber-500" size={16} />
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Efficiency Breakdown</p>
                        </div>
                        <div className="bg-amber-50/50 px-3 py-1 rounded-xl border border-amber-100/50 text-right">
                            <p className="text-[8px] font-black text-amber-500 uppercase leading-none mb-0.5">Total Velocity</p>
                            <p className="text-sm font-black text-amber-700">{retention.avgDaysToConfirm} Days</p>
                        </div>
                    </div>

                    <div className="space-y-4 flex-1">
                        {[
                            { label: 'Nurturing', time: (parseFloat(retention.avgDaysToConfirm || '0') * 0.4).toFixed(1), color: 'bg-emerald-500' },
                            { label: 'Follow-up', time: (parseFloat(retention.avgDaysToConfirm || '0') * 0.3).toFixed(1), color: 'bg-amber-500' },
                            { label: 'Admission', time: (parseFloat(retention.avgDaysToConfirm || '0') * 0.3).toFixed(1), color: 'bg-rose-500' }
                        ].map((step) => (
                            <div key={step.label} className="group cursor-default">
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{step.label}</span>
                                    <span className="text-xs font-black text-gray-900">{step.time} Days</span>
                                </div>
                                <div className="h-2 bg-gray-50 rounded-full overflow-hidden border border-gray-100/50">
                                    <div
                                        className={`h-full ${step.color} rounded-full transition-all duration-1000 shadow-sm`}
                                        style={{ width: `${Math.min(100, (parseFloat(step.time) / parseFloat(retention.avgDaysToConfirm || '1')) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 p-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-center gap-3">
                        <Activity className="text-emerald-500" size={18} />
                        <p className="text-[10px] font-bold text-gray-400 leading-relaxed italic">
                            * Conversion speed is calculated from lead creation to admission confirmation.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
