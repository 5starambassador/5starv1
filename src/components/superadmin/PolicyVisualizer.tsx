'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Activity, Target } from 'lucide-react'

interface PolicyVisualizerProps {
    slabs: { referralCount: number; yearFeeBenefitPercent: number; baseLongTermPercent: number }[]
    activeTab: 'Standard' | 'Long Term'
}

export function PolicyVisualizer({ slabs = [], activeTab }: PolicyVisualizerProps) {
    if (!slabs.length) return null

    const sortedSlabs = [...slabs].sort((a, b) => a.referralCount - b.referralCount)
    const maxVal = Math.max(...sortedSlabs.map(s => activeTab === 'Standard' ? s.yearFeeBenefitPercent : s.baseLongTermPercent))

    // SVG Dimensions
    const width = 400
    const height = 180
    const padding = 20

    // Map points to SVG coordinates
    const points = sortedSlabs.map((s, i) => {
        const x = padding + (i * (width - 2 * padding) / (sortedSlabs.length - 1))
        const val = activeTab === 'Standard' ? s.yearFeeBenefitPercent : s.baseLongTermPercent
        const y = height - padding - (val * (height - 2 * padding) / maxVal)
        return { x, y, val, count: s.referralCount }
    })

    const pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
    const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`

    return (
        <div className="bg-slate-900 rounded-[32px] p-6 border border-white/5 relative overflow-hidden group">
            {/* Background Grid */}
            <div className="absolute inset-x-0 bottom-5 h-[1px] bg-white/5" />
            <div className="absolute inset-x-0 bottom-15 h-[1px] bg-white/5" />
            <div className="absolute inset-x-0 bottom-25 h-[1px] bg-white/5" />

            <div className="relative z-10 flex justify-between items-end mb-6">
                <div>
                    <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1 flex items-center gap-2">
                        <Activity size={12} className="text-blue-500" />
                        Yield Velocity
                    </h4>
                    <p className="text-sm font-black text-white tracking-tight uppercase italic flex items-center gap-2">
                        {activeTab === 'Standard' ? 'Aggressive Scaling' : 'Linear Stability'}
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-[18px] font-black text-blue-500 tracking-tighter italic">{maxVal}%</p>
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Cap Limit</p>
                </div>
            </div>

            <div className="relative h-[180px] w-full">
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible drop-shadow-2xl">
                    <defs>
                        <linearGradient id="gradientArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={activeTab === 'Standard' ? '#3b82f6' : '#10b981'} stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Gradient Area */}
                    <motion.path
                        initial={{ opacity: 0, d: areaD }}
                        animate={{ opacity: 1, d: areaD }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        d={areaD}
                        fill="url(#gradientArea)"
                    />

                    {/* Main Line */}
                    <motion.path
                        initial={{ pathLength: 0, opacity: 0 }}
                        animate={{ pathLength: 1, opacity: 1 }}
                        transition={{ duration: 1.5, ease: 'easeInOut' }}
                        d={pathD}
                        fill="none"
                        stroke={activeTab === 'Standard' ? '#3b82f6' : '#10b981'}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* Points */}
                    {points.map((p, i) => (
                        <motion.g
                            key={i}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.5 + i * 0.1, type: 'spring' }}
                        >
                            <circle
                                cx={p.x}
                                cy={p.y}
                                r="4"
                                fill={activeTab === 'Standard' ? '#3b82f6' : '#10b981'}
                                className="drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]"
                            />
                            <text
                                x={p.x}
                                y={p.y - 12}
                                className="fill-white/60 text-[10px] font-black font-mono text-center"
                                textAnchor="middle"
                            >
                                {p.val}%
                            </text>
                            <text
                                x={p.x}
                                y={height - 2}
                                className="fill-white/20 text-[8px] font-black uppercase tracking-widest"
                                textAnchor="middle"
                            >
                                R{p.count}
                            </text>
                        </motion.g>
                    ))}
                </svg>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-white/40" />
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Institutional Path 2.0</span>
                </div>
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/20" />
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500/10" />
                </div>
            </div>
        </div>
    )
}
