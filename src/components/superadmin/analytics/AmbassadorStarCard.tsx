'use client'

import React from 'react'
import { Star, Sparkles, Target } from 'lucide-react'
import {
    ResponsiveContainer,
    PieChart as RePieChart,
    Pie,
    Cell,
    Tooltip as ReTooltip,
    Legend
} from 'recharts'

interface AmbassadorStarCardProps {
    milestones: {
        distribution: any[]
        risingStars: any[]
    }
}

export function AmbassadorStarCard({ milestones }: AmbassadorStarCardProps) {
    const STAR_COLORS = ['#EAB308', '#F59E0B', '#D97706', '#B45309', '#78350F']

    return (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] p-8 h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black flex items-center gap-3 text-gray-900">
                    <Star className="text-amber-500" size={24} fill="currentColor" />
                    Ambassador Star Network
                </h3>
            </div>

            <div className="flex flex-col gap-10 flex-1">
                {/* Visual Distribution */}
                <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Global Tier Mix</p>
                        <div className="h-px bg-gray-50 flex-1 mx-4" />
                    </div>
                    <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <RePieChart>
                                <Pie
                                    data={milestones.distribution}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={75}
                                    paddingAngle={5}
                                    dataKey="value"
                                    animationBegin={0}
                                    animationDuration={1500}
                                >
                                    {milestones.distribution.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={STAR_COLORS[index % STAR_COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <ReTooltip
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                    itemStyle={{ fontSize: '12px', fontWeight: 900 }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 700, paddingTop: '10px' }} />
                            </RePieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Rising Stars List */}
                <div className="flex flex-col">
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <Sparkles className="text-amber-500" size={16} />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Growth Opportunities (Rising Stars)</p>
                        <div className="h-px bg-gray-50 flex-1 ml-2" />
                    </div>
                    <div className="space-y-3 flex-1">
                        {milestones.risingStars.length > 0 ? (
                            milestones.risingStars.slice(0, 5).map((star: any) => (
                                <div key={star.name} className="bg-gray-50/50 border border-gray-100/50 rounded-2xl p-4 flex items-center justify-between group hover:border-gray-200 hover:bg-white transition-all shadow-sm hover:shadow-md cursor-default">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-11 h-11 rounded-full bg-white flex-shrink-0 flex items-center justify-center font-black text-sm shadow-sm border border-gray-100 text-gray-700 uppercase">
                                            {star.name.charAt(0)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-black text-sm leading-tight text-gray-900 tracking-tight truncate" title={star.name}>{star.name}</p>
                                            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-black truncate">{star.campus}</p>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                        <div className="flex items-center gap-1 justify-end">
                                            <Star size={10} className="text-amber-500" fill="currentColor" />
                                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none">Needs {star.needed - star.current}</p>
                                        </div>
                                        <p className="text-[11px] font-bold text-gray-500 mt-1">to reach <span className="text-gray-900 font-black whitespace-nowrap">{star.nextTier}</span></p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-40 flex flex-col items-center justify-center opacity-40 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                                <Target size={32} className="mb-3 text-gray-400" />
                                <p className="text-xs font-black text-gray-500 uppercase tracking-widest">Network Stable</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
