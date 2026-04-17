'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { getCampuses } from '@/app/campus-actions'
import { Campus } from '@/types'

export function CampusFilter() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [campuses, setCampuses] = useState<Campus[]>([])
    const [loading, setLoading] = useState(true)

    const currentCampus = searchParams.get('campus') || 'All'

    useEffect(() => {
        async function loadCampuses() {
            const res = await getCampuses()
            if (res.success && res.campuses) {
                setCampuses(res.campuses as unknown as Campus[])
            }
            setLoading(false)
        }
        loadCampuses()
    }, [])

    const handleCampusChange = (campus: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (campus && campus !== 'All') {
            params.set('campus', campus)
        } else {
            params.delete('campus')
        }
        // Reset page when filter changes
        params.delete('page')
        router.push(`?${params.toString()}`)
    }

    if (loading) return null

    return (
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-1.5 shadow-sm hover:shadow-md transition-all">
            <Building2 size={14} className="text-gray-400" />
            <select
                value={currentCampus}
                onChange={(e) => handleCampusChange(e.target.value)}
                className="bg-transparent border-none focus:ring-0 text-[11px] font-black uppercase tracking-widest text-gray-700 cursor-pointer outline-none"
                aria-label="Filter by Campus"
            >
                <option value="All">All Campuses</option>
                {campuses.map((c) => (
                    <option key={c.id} value={c.campusName}>
                        {c.campusName}
                    </option>
                ))}
            </select>
        </div>
    )
}
