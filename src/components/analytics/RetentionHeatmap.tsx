'use client'

import { useEffect, useState } from 'react'
import { getRetentionData, CohortRetention } from '@/app/analytics-actions'
import { Loader2, Users, Calendar } from 'lucide-react'

export function RetentionHeatmap({ campus }: { campus?: string }) {
    const [data, setData] = useState<CohortRetention[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchRetention = async () => {
            setLoading(true)
            try {
                const result = await getRetentionData({ campus })
                setData(result)
            } catch (error) {
                console.error('Failed to fetch retention:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchRetention()
    }, [campus])

    const getHeatColor = (percent: number, isBaseline: boolean) => {
        if (isBaseline) return 'bg-gray-100 text-gray-900 border-2 border-gray-200'
        if (percent >= 80) return 'bg-emerald-600 text-white'
        if (percent >= 60) return 'bg-emerald-500 text-white'
        if (percent >= 40) return 'bg-emerald-400 text-emerald-950'
        if (percent >= 20) return 'bg-emerald-100 text-emerald-800'
        if (percent > 0) return 'bg-red-50 text-red-600 border border-red-100'
        return 'bg-gray-50 text-gray-300'
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-gray-100">
                <Loader2 className="animate-spin text-red-600 mb-4" size={32} />
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Calculating Cohorts...</p>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm animate-fade-in">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Users className="text-red-600" size={24} />
                        Ambassador Retention Heatmap
                    </h3>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
                        Monthly Cohort Analysis (Engagement Over 6 Months)
                    </p>
                </div>
                <div className="bg-gray-50 px-4 py-2 rounded-xl flex items-center gap-2">
                    <Calendar size={14} className="text-gray-400" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Retention %</span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr>
                            <th className="text-left py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Join Cohort</th>
                            <th className="text-center py-3 px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Size</th>
                            {[...Array(6)].map((_, i) => (
                                <th key={i} className="text-center py-3 px-2 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                                    Month {i}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((cohort, idx) => (
                            <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                                <td className="py-4 px-4 border-b border-gray-50">
                                    <span className="text-sm font-bold text-gray-900 group-hover:text-red-700 transition-colors">
                                        {cohort.month}
                                    </span>
                                </td>
                                <td className="py-4 px-4 text-center border-b border-gray-50">
                                    <span className="bg-gray-100 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                                        {cohort.size} Users
                                    </span>
                                </td>
                                {cohort.retention.map((percent, pIdx) => (
                                    <td key={pIdx} className="p-1 border-b border-gray-50">
                                        <div className={`
                                            h-12 w-full flex items-center justify-center rounded-xl text-[11px] font-black transition-all hover:scale-105 active:scale-95 shadow-sm
                                            ${getHeatColor(percent, pIdx === 0)}
                                        `}>
                                            {percent}%
                                        </div>
                                    </td>
                                ))}
                                {/* Empty cells for future months in newer cohorts */}
                                {[...Array(6 - cohort.retention.length)].map((_, i) => (
                                    <td key={`empty-${i}`} className="p-1 border-b border-gray-50">
                                        <div className="h-12 w-full bg-gray-50/20 rounded-xl" />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-8 flex items-center gap-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Legend:</p>
                <div className="flex items-center gap-4">
                    {[
                        { label: '80%+', color: 'bg-emerald-600' },
                        { label: '40%+', color: 'bg-emerald-400' },
                        { label: 'Churn Risk', color: 'bg-red-50' }
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${item.color}`} />
                            <span className="text-[10px] font-bold text-gray-500 uppercase">{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
