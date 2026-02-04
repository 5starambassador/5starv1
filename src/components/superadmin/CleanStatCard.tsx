'use client'

import { LucideIcon, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { motion } from 'framer-motion'

interface CleanStatCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    iconColor: string
    change?: {
        value: number
        isIncrease: boolean
    }
    subtext: string | React.ReactNode
}

export function CleanStatCard({ title, value, icon: Icon, iconColor, change, subtext }: CleanStatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
            <div className="flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-2xl ${iconColor} flex items-center justify-center transition-transform duration-500 group-hover:scale-110 shadow-sm`}>
                    <Icon size={24} strokeWidth={2.5} />
                </div>
                {change && (
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${change.isIncrease ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                        }`}>
                        {change.isIncrease ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                        {change.value.toFixed(1)}%
                    </div>
                )}
            </div>

            <div className="space-y-1">
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">{title}</p>
                <h3 className="text-3xl font-black text-gray-900 tracking-tight italic">
                    {value}
                </h3>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-50">
                <div className="text-[11px] font-bold text-gray-500 min-h-[20px]">
                    {subtext}
                </div>
            </div>
        </motion.div>
    )
}
