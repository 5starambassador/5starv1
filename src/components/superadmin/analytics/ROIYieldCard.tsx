'use client'

import React from 'react'
import { Zap } from 'lucide-react'

interface ROIYieldCardProps {
    roi: {
        revenue: number
        cost: number
        netYield: number
        roiRatio: string
        breakdown: { role: string; net: number }[]
    } | null
}

export function ROIYieldCard({ roi }: ROIYieldCardProps) {
    if (!roi) return null

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] p-8 relative overflow-hidden h-full flex flex-col">
            <h3 className="text-xl font-black mb-8 flex items-center gap-3 text-gray-900">
                <Zap className="text-amber-500" size={24} fill="currentColor" />
                Financial ROI Yield
            </h3>

            <div className="space-y-8 relative z-10 flex-1">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Gross Yield</p>
                        <p className="text-2xl font-black text-gray-900 tracking-tight">₹{roi.revenue.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Benefit Cost</p>
                        <p className="text-2xl font-black text-rose-500 tracking-tight">- ₹{roi.cost.toLocaleString()}</p>
                    </div>
                </div>

                <div className="h-px bg-gray-100" />

                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Net Program Yield</p>
                        <p className="text-4xl font-black text-emerald-600 tracking-tighter">₹{roi.netYield.toLocaleString()}</p>
                    </div>
                    <div className="bg-amber-50/50 border border-amber-100/50 px-4 py-2 rounded-2xl text-center">
                        <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest mb-0.5">Efficiency</p>
                        <p className="text-xl font-black text-amber-600 leading-none">{roi.roiRatio}x</p>
                    </div>
                </div>

                {/* Segmented Profitability */}
                <div className="space-y-5 pt-8 border-t border-gray-100 mt-auto">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Net Yield by Role</p>
                    <div className="space-y-4">
                        {roi.breakdown.slice(0, 3).map((seg) => (
                            <div key={seg.role} className="space-y-2">
                                <div className="flex justify-between text-[11px] font-black">
                                    <span className="text-gray-500 uppercase tracking-tighter">{seg.role}</span>
                                    <span className="text-emerald-600 font-black tracking-tight">₹{(seg.net / 1000).toFixed(0)}k</span>
                                </div>
                                <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${Math.min(100, (seg.net / (roi.netYield || 1)) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
