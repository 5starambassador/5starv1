import { Building2, TrendingUp, Users, CheckCircle } from 'lucide-react'

interface CampusComparison {
    campus: string
    totalLeads: number
    confirmed: number
    pending: number
    conversionRate: number
    ambassadors: number
}

interface CampusPerformanceTableProps {
    comparison: CampusComparison[]
    onCampusClick?: (campusName: string) => void
    isExpanded?: boolean
    onToggleExpand?: () => void
}

export function CampusPerformanceTable({ comparison, onCampusClick, isExpanded = false, onToggleExpand }: CampusPerformanceTableProps) {
    return (
        <div className={`bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden premium-border transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-50 h-auto' : 'h-full'}`}>
            <div style={{ padding: '24px 32px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f9fafb)' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#111827', display: 'flex', alignItems: 'center', gap: '10px', letterSpacing: '-0.02em' }}>
                    <div className="p-2 bg-red-50 rounded-xl">
                        <Building2 size={20} className="text-[#CC0000]" />
                    </div>
                    Campus Performance Comparison
                </h3>
                {onToggleExpand && (
                    <button
                        onClick={onToggleExpand}
                        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
                        title={isExpanded ? "Minimize" : "Full Screen"}
                    >
                        {isExpanded ? (
                            <div className="flex items-center gap-1 bg-red-50 px-3 py-1 rounded-lg text-red-600 font-bold text-xs">
                                <span>CLOSE VIEW</span>
                            </div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>
                        )}
                    </button>
                )}
            </div>
            <div className={`overflow-auto ${isExpanded ? 'h-[calc(100vh-100px)]' : 'max-h-[500px]'}`}>
                <table className="w-full border-collapse block md:table">
                    <thead className="hidden md:table-header-group">
                        <tr className="bg-gray-50/50 border-b border-gray-100 sticky top-0 z-10 backdrop-blur-md">
                            <th className="p-5 text-left text-[11px] font-black text-gray-500 uppercase tracking-widest">Campus</th>
                            <th className="p-5 text-center text-[11px] font-black text-gray-500 uppercase tracking-widest">Total Leads</th>
                            <th className="p-5 text-center text-[11px] font-black text-gray-500 uppercase tracking-widest">Confirmed</th>
                            <th className="p-5 text-center text-[11px] font-black text-gray-500 uppercase tracking-widest">Ambassadors</th>
                            <th className="p-5 text-right text-[11px] font-black text-gray-500 uppercase tracking-widest w-[150px]">Conv. Rate</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 block md:table-row-group p-4 md:p-0">
                        {comparison.map((c) => (
                            <tr
                                key={c.campus}
                                onClick={() => onCampusClick?.(c.campus)}
                                className="group hover:bg-blue-50/50 transition-all cursor-pointer block md:table-row bg-white rounded-2xl md:rounded-none border border-gray-100 md:border-b md:border-x-0 md:border-t-0 mb-4 md:mb-0 shadow-sm md:shadow-none p-4 md:p-0 relative"
                            >
                                <td className="p-2 md:p-5 flex justify-between md:table-cell items-center">
                                    <span className="md:hidden font-bold text-gray-400 text-xs uppercase tracking-wider">Campus</span>
                                    <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-gray-900 text-[15px] group-hover:text-blue-700 transition-colors">{c.campus}</span>
                                        {c.pending > 20 && (
                                            <div title="High Pending Leads" className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                        )}
                                    </div>
                                </td>
                                <td className="p-2 md:p-5 flex justify-between md:table-cell items-center md:text-center">
                                    <span className="md:hidden font-bold text-gray-400 text-xs uppercase tracking-wider">Total Leads</span>
                                    <span className="font-bold text-gray-700 text-sm">{c.totalLeads.toLocaleString()}</span>
                                </td>
                                <td className="p-2 md:p-5 flex justify-between md:table-cell items-center md:text-center">
                                    <span className="md:hidden font-bold text-gray-400 text-xs uppercase tracking-wider">Confirmed</span>
                                    <div className="flex items-center justify-end md:justify-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <span className="font-extrabold text-emerald-600 text-sm">{c.confirmed.toLocaleString()}</span>
                                    </div>
                                </td>
                                <td className="p-2 md:p-5 flex justify-between md:table-cell items-center md:text-center">
                                    <span className="md:hidden font-bold text-gray-400 text-xs uppercase tracking-wider">Ambassadors</span>
                                    <div className="flex items-center justify-end md:justify-center gap-2">
                                        <Users size={14} className="text-blue-500" />
                                        <span className="font-bold text-blue-600 text-sm">{c.ambassadors.toLocaleString()}</span>
                                    </div>
                                </td>
                                <td className="p-2 md:p-5 flex justify-between md:table-cell items-center md:text-right">
                                    <span className="md:hidden font-bold text-gray-400 text-xs uppercase tracking-wider">Conv. Rate</span>
                                    <div className="w-full max-w-[140px] ml-auto">
                                        <div className="flex justify-between items-end mb-1">
                                            <span className={`text-[10px] font-black ${c.conversionRate > 30 ? 'text-emerald-600' : c.conversionRate > 10 ? 'text-orange-500' : 'text-red-500'}`}>
                                                {c.conversionRate}%
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${c.conversionRate > 30 ? 'bg-emerald-500' : c.conversionRate > 10 ? 'bg-orange-400' : 'bg-red-500'}`}
                                                style={{ width: `${Math.min(c.conversionRate, 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
