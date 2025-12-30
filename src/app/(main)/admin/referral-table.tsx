'use client'

import { CheckCircle, Filter, ChevronDown, Clock, AlertCircle, Phone, MapPin, User, Search } from 'lucide-react'
import { useState, useMemo } from 'react'
import { PremiumCard } from '@/components/premium/PremiumCard'
import { toast } from 'sonner'

interface ReferralTableProps {
    referrals: any[]
    confirmReferral: (leadId: number) => Promise<any>
    convertLeadToStudent?: (leadId: number, details: any) => Promise<any>
    initialRoleFilter?: string
    initialStatusFilter?: string
    isReadOnly?: boolean
}

export function ReferralTable({
    referrals,
    confirmReferral,
    convertLeadToStudent,
    initialRoleFilter,
    initialStatusFilter,
    isReadOnly = false
}: ReferralTableProps) {
    const [roleFilter, setRoleFilter] = useState<string>(initialRoleFilter || 'All')
    const [statusFilter, setStatusFilter] = useState<string>(initialStatusFilter || 'All')
    const [campusFilter, setCampusFilter] = useState<string>('All')
    const [searchQuery, setSearchQuery] = useState<string>('')

    // Get unique values for filters
    const campuses = useMemo(() => {
        const uniqueCampuses = new Set(referrals.map(r => r.campus))
        return Array.from(uniqueCampuses).sort()
    }, [referrals])

    // Filtered referrals
    const filteredReferrals = useMemo(() => {
        return referrals.filter(r => {
            const matchesRole = roleFilter === 'All' || r.user.role === roleFilter
            const matchesStatus = statusFilter === 'All' || r.leadStatus === statusFilter
            const matchesCampus = campusFilter === 'All' || r.campus === campusFilter
            const matchesSearch = searchQuery === '' ||
                r.parentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.parentMobile.includes(searchQuery) ||
                r.user.fullName.toLowerCase().includes(searchQuery.toLowerCase())

            return matchesRole && matchesStatus && matchesCampus && matchesSearch
        })
    }, [referrals, roleFilter, statusFilter, campusFilter, searchQuery])

    return (
        <PremiumCard>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-red-50 text-red-600 rounded-xl">
                        <User size={20} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Active Referrals</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-0.5">{filteredReferrals.length} Leads Found</p>
                    </div>
                </div>
            </div>
            <div className="space-y-6">
                {/* Filters */}
                <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex flex-wrap gap-4">
                    <div className="flex-1 min-w-[240px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search by parent name or mobile..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all text-sm font-medium"
                        />
                    </div>

                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm font-medium text-gray-700 cursor-pointer"
                    >
                        <option value="All">All Roles</option>
                        <option value="Parent">Parent</option>
                        <option value="Staff">Staff</option>
                    </select>

                    <select
                        value={campusFilter}
                        onChange={(e) => setCampusFilter(e.target.value)}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm font-medium text-gray-700 cursor-pointer"
                    >
                        <option value="All">All Campuses</option>
                        {campuses.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 text-sm font-medium text-gray-700 cursor-pointer"
                    >
                        <option value="All">All Status</option>
                        <option value="New">New</option>
                        <option value="Follow-up">Follow-up</option>
                        <option value="Confirmed">Confirmed</option>
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Referrer</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Lead Details</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Campus</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Est. Multiplier</th>
                                <th className="px-6 py-4 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-bold text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredReferrals.map((r: any) => {
                                const isNew = r.leadStatus === 'New'
                                const createdDate = new Date(r.createdAt)
                                const hoursOld = (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60)
                                const isUrgent = isNew && hoursOld > 48

                                return (
                                    <tr key={r.leadId} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${r.user.role === 'Staff' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    <User size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{r.user.fullName}</p>
                                                    <p className="text-xs text-gray-500 font-mono">{r.user.referralCode}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide ${r.user.role === 'Staff' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100'}`}>
                                                {r.user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-bold text-gray-900">{r.parentName}</p>
                                                    {isUrgent && (
                                                        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-bold uppercase">
                                                            <AlertCircle size={10} /> Urgent
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                                    <div className="flex items-center gap-1">
                                                        <Phone size={12} />
                                                        <span>{r.parentMobile}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        <span>
                                                            {hoursOld < 24 ? `${Math.round(hoursOld)}h ago` : `${Math.round(hoursOld / 24)}d ago`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1.5 text-gray-600">
                                                <MapPin size={14} className="text-gray-400" />
                                                <span className="text-sm font-medium">{r.campus || 'General'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex flex-col items-center justify-center px-3 py-1.5 rounded-lg bg-gray-50 border border-dashed border-gray-200">
                                                <p className="text-sm font-black text-red-600">
                                                    ₹{((r.user.studentFee || 60000) * (r.user.yearFeeBenefitPercent || 0) / 100).toLocaleString('en-IN')}
                                                </p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Metric</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${r.leadStatus === 'Confirmed' ? 'bg-green-500' : r.leadStatus === 'Follow-up' ? 'bg-amber-500' : 'bg-gray-400'}`}></div>
                                                <span className={`text-sm font-bold ${r.leadStatus === 'Confirmed' ? 'text-green-700' : r.leadStatus === 'Follow-up' ? 'text-amber-700' : 'text-gray-600'}`}>
                                                    {r.leadStatus}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {r.leadStatus !== 'Confirmed' ? (
                                                !isReadOnly && (
                                                    <form action={async () => await confirmReferral(r.leadId)}>
                                                        <button className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-500/30 transition-all hover:-translate-y-0.5 active:translate-y-0">
                                                            Confirm
                                                        </button>
                                                    </form>
                                                )
                                            ) : (
                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="flex items-center gap-1.5 text-green-600">
                                                        <span className="text-xs font-bold">Verified</span>
                                                        <CheckCircle size={16} />
                                                    </div>
                                                    {r.student ? (
                                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
                                                            In Student Mgmt
                                                        </span>
                                                    ) : (
                                                        convertLeadToStudent && !isReadOnly && (
                                                            <ConversionButton
                                                                leadId={r.leadId}
                                                                studentName={r.studentName || r.parentName + "'s Child"}
                                                                convertLeadToStudent={convertLeadToStudent}
                                                            />
                                                        )
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )
                            })}
                            {filteredReferrals.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-12 text-center text-gray-400">
                                        <Filter size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="text-sm font-bold">No matching referrals found</p>
                                        <p className="text-xs">Try adjusting your filters</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </PremiumCard>
    )
}

function ConversionButton({ leadId, studentName, convertLeadToStudent }: { leadId: number, studentName: string, convertLeadToStudent: (id: number, details: any) => Promise<any> }) {
    const [isConverting, setIsConverting] = useState(false)

    return (
        <button
            onClick={async () => {
                if (isConverting) return

                const tid = toast.loading(`Converting ${studentName} to student...`)
                setIsConverting(true)
                try {
                    const res = await convertLeadToStudent(leadId, { studentName })
                    if (res.success) {
                        toast.success('Successfully added to students!', { id: tid })
                    } else {
                        toast.error(res.error || 'Conversion failed', { id: tid })
                        setIsConverting(false)
                    }
                } catch (error) {
                    toast.error('An unexpected error occurred', { id: tid })
                    setIsConverting(false)
                }
            }}
            disabled={isConverting}
            className={`px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-md transition-all uppercase tracking-tight flex items-center gap-2 ${isConverting ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
            {isConverting ? (
                <>
                    <Clock size={12} className="animate-spin" />
                    Processing...
                </>
            ) : (
                'Add to Students'
            )}
        </button>
    )
}
