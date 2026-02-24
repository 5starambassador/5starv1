'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar } from 'lucide-react'
import { getAcademicYears } from '@/app/settings-actions'

export interface AcademicYear {
    id: number
    year: string
    isCurrent: boolean
    isActive: boolean
}

export function AcademicYearFilter() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [years, setYears] = useState<AcademicYear[]>([])
    const [loading, setLoading] = useState(true)

    const currentYear = searchParams.get('year') || ''

    useEffect(() => {
        async function loadYears() {
            const res = await getAcademicYears()
            if (res.success && res.data) {
                setYears(res.data)
            }
            setLoading(false)
        }
        loadYears()
    }, [])

    const handleYearChange = (year: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (year && year !== 'All') {
            params.set('year', year)
        } else {
            params.delete('year')
        }
        router.push(`?${params.toString()}`)
    }

    if (loading) return null

    return (
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-1.5 shadow-sm hover:shadow-md transition-all">
            <Calendar size={14} className="text-gray-400" />
            <select
                value={currentYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-[11px] font-black uppercase tracking-widest text-gray-700 cursor-pointer outline-none"
            >
                <option value="All">All Years</option>
                {years.map((y) => (
                    <option key={y.id} value={y.year}>
                        {y.year} {y.isCurrent ? '(Current)' : ''}
                    </option>
                ))}
            </select>
        </div>
    )
}
