'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar } from 'lucide-react'

export function DateRangeSelector({ currentDays }: { currentDays: number }) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const handlePeriodChange = (days: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('days', days.toString())
        router.push(`?${params.toString()}`)
    }

    const periods = [
        { label: 'Last 7 Days', value: 7 },
        { label: 'Last 30 Days', value: 30 },
        { label: 'Last 90 Days', value: 90 },
        { label: 'All Time', value: 0 }
    ]

    return (
        <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 p-1 shadow-sm w-fit">
            <div className="px-2 text-gray-400">
                <Calendar size={16} />
            </div>
            {periods.map((p) => (
                <button
                    key={p.value}
                    onClick={() => handlePeriodChange(p.value)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${currentDays === p.value
                        ? 'bg-[#CC0000] text-white shadow-md'
                        : 'text-gray-500 hover:bg-gray-50'
                        }`}
                >
                    {p.label}
                </button>
            ))}
        </div>
    )
}
