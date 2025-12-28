'use client'

import { useState } from 'react'
import { Target, X, Check, Loader2 } from 'lucide-react'
import { updateCampusTargets } from '@/app/actions/campus-dashboard-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface CampusTargetModalProps {
    currentLeads?: number
    currentAdmissions?: number
}

export function CampusTargetModal({ currentLeads = 0, currentAdmissions = 0 }: CampusTargetModalProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [leads, setLeads] = useState(currentLeads)
    const [admissions, setAdmissions] = useState(currentAdmissions)
    const router = useRouter()

    const handleSave = async () => {
        setLoading(true)
        try {
            const res = await updateCampusTargets(leads, admissions)
            if (res.success) {
                toast.success('Monthly targets updated successfully')
                setIsOpen(false)
                router.refresh()
            } else {
                toast.error(res.error || 'Failed to update targets')
            }
        } catch (error) {
            toast.error('Something went wrong')
        }
        setLoading(null as any)
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-bold hover:bg-gray-50 transition-all shadow-sm"
            >
                <Target size={16} className="text-primary-maroon" />
                Manage Targets
            </button>
        )
    }

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-spring-up overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-primary-maroon to-primary-maroon/90 text-white flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Target size={20} />
                        </div>
                        <h3 className="font-bold text-lg">Set Monthly Goals</h3>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Leads Target</label>
                        <input
                            type="number"
                            value={leads}
                            onChange={(e) => setLeads(parseInt(e.target.value) || 0)}
                            className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-maroon/20 focus:border-primary-maroon transition-all"
                            placeholder="e.g. 50"
                        />
                        <p className="text-[10px] text-gray-400">Target for new generated referrals this month.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Admissions Target</label>
                        <input
                            type="number"
                            value={admissions}
                            onChange={(e) => setAdmissions(parseInt(e.target.value) || 0)}
                            className="w-full h-12 bg-gray-50 border border-gray-100 rounded-2xl px-4 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-maroon/20 focus:border-primary-maroon transition-all"
                            placeholder="e.g. 20"
                        />
                        <p className="text-[10px] text-gray-400">Target for confirmed admissions this month.</p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            onClick={() => setIsOpen(false)}
                            className="flex-1 h-12 rounded-2xl border border-gray-100 font-bold text-gray-500 hover:bg-gray-50 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="flex-[2] h-12 bg-primary-maroon text-white rounded-2xl font-bold hover:bg-primary-maroon/90 transition-all shadow-lg shadow-primary-maroon/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                            {loading ? 'Saving...' : 'Update Targets'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
