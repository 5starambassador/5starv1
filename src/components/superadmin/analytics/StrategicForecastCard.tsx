'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'

interface StrategicForecastCardProps {
    intelligence: {
        campuses: any[]
        totalPredicted: number
        avgVelocity: string
    }
}

export function StrategicForecastCard({ intelligence }: StrategicForecastCardProps) {
    return (
        <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] p-8 relative overflow-hidden h-full flex flex-col">
            <div className="relative z-10 flex-1 flex flex-col">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center border border-indigo-100/50 shadow-sm">
                        <Sparkles className="text-indigo-600" size={28} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Strategic Forecast</h3>
                        <p className="text-gray-400 text-[13px] font-bold">30-Day Predictive Admissions Yield</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8">
                    <div className="bg-gray-50/50 border border-gray-100 rounded-3xl p-6 shadow-sm">
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1.5 px-1">Expected Admissions</p>
                        <p className="text-5xl font-black text-gray-900 tracking-tighter">+{intelligence.totalPredicted}</p>
                        <p className="text-[11px] font-bold text-gray-400 mt-2 px-1">Next 30 Days Forecast</p>
                    </div>
                    <div className="bg-gray-50/50 border border-gray-100 rounded-3xl p-6 shadow-sm">
                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1.5 px-1">Avg. Velocity</p>
                        <p className="text-5xl font-black text-emerald-600 tracking-tighter">{intelligence.avgVelocity}</p>
                        <p className="text-[11px] font-bold text-gray-400 mt-2 px-1">Days to Confirm (Avg)</p>
                    </div>
                </div>

                <div className="space-y-4 flex-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">High-Yield Campuses</p>
                    <div className="space-y-1">
                        {intelligence.campuses.slice(0, 4).sort((a, b) => b.predictedYield - a.predictedYield).map((camp: any) => (
                            <div key={camp.campus} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 px-2 rounded-xl transition-all">
                                <span className="font-black text-sm text-gray-700 truncate" title={camp.campus}>{camp.campus}</span>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-gray-400 uppercase leading-none mb-1">Pipeline</p>
                                        <p className="text-sm font-black text-gray-600">{camp.pipelineSize}</p>
                                    </div>
                                    <div className="text-right min-w-[60px]">
                                        <p className="text-[9px] font-black text-emerald-500 uppercase leading-none mb-1">Yield</p>
                                        <p className="text-sm font-black text-emerald-600">+{camp.predictedYield}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
