import { LucideIcon } from 'lucide-react'

interface CleanStatCardProps {
    title: string
    value: string | number
    icon: LucideIcon
    subtext?: string
    change?: { value: number; isIncrease: boolean }
    iconColor?: string
    trend?: 'up' | 'down' | 'neutral'
}

export function CleanStatCard({ title, value, icon: Icon, subtext, change, iconColor = "text-gray-500", trend }: CleanStatCardProps) {
    return (
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-[32px] border border-white/50 shadow-xl shadow-gray-200/50 hover:shadow-2xl hover:shadow-gray-200/80 transition-all duration-300 group">
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <h3 className="text-3xl font-black text-gray-900 tracking-tighter italic">
                            {typeof value === 'number' ? value.toLocaleString() : value}
                        </h3>
                    </div>
                </div>
                <div className={`p-3 rounded-2xl bg-white shadow-inner border border-gray-50 ${iconColor} group-hover:scale-110 transition-transform duration-500`}>
                    <Icon size={22} strokeWidth={2.5} />
                </div>
            </div>
            {(subtext || change) && (
                <div className="mt-6 flex items-center justify-between">
                    {change && (
                        <div className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${change.isIncrease ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                            {change.isIncrease ? '↑' : '↓'} {change.value}%
                        </div>
                    )}
                    {subtext && (
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{subtext}</span>
                    )}
                </div>
            )}
        </div>
    )
}
