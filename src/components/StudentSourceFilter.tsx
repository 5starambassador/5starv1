'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Filter, Users } from 'lucide-react'

export function StudentSourceFilter() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Default to 'referral' if not specified
    const currentSource = searchParams.get('source') || 'referral'

    const handleSourceChange = (source: string) => {
        const params = new URLSearchParams(searchParams.toString())
        if (source === 'referral') {
            params.delete('source') // Referral is default
        } else {
            params.set('source', source)
        }
        router.push(`?${params.toString()}`)
    }

    return (
        <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-1.5 shadow-sm hover:shadow-md transition-all">
            <Users size={14} className="text-gray-400" />
            <select
                value={currentSource}
                onChange={(e) => handleSourceChange(e.target.value)}
                suppressHydrationWarning={true}
                className="bg-transparent border-none focus:ring-0 text-[11px] font-black uppercase tracking-widest text-gray-700 cursor-pointer outline-none"
            >
                <option value="referral">Referral Students</option>
                <option value="organic">ERP / Organic</option>
                <option value="all">All Students</option>
            </select>
        </div>
    )
}
