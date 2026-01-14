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
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{title}</p>
                    <div className="mt-2 flex items-baseline gap-2">
                        <h3 className="text-2xl font-bold text-gray-900">
                            {typeof value === 'number' ? value.toLocaleString() : value}
                        </h3>
                    </div>
                </div>
                <div className={`p-2 rounded-lg bg-gray-50 ${iconColor}`}>
                    <Icon size={20} />
                </div>
            </div>
            {(subtext || change) && (
                <div className="mt-4 flex items-center text-sm">
                    {change && (
                        <span className={`font-medium ${change.isIncrease ? 'text-green-600' : 'text-red-600'} flex items-center gap-1`}>
                            {change.isIncrease ? '+' : '-'}{change.value}%
                        </span>
                    )}
                    {subtext && (
                        <span className="text-gray-500 ml-2">{subtext}</span>
                    )}
                </div>
            )}
        </div>
    )
}
