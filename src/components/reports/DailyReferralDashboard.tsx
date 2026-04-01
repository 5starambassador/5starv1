'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, RefreshCw, ChevronLeft, ChevronRight, Download, Filter, TrendingUp, FileDown } from 'lucide-react'
import { getDailyReferralReport } from '@/app/report-actions'
import { toast } from 'sonner'

interface ReportRows {
    slNo: number
    campusName: string
    cumulative: { total: number; admitted: number }
    daily: { new: number; admitted: number; total: number }
}

interface ReportData {
    reportRows: ReportRows[]
    grandTotals: {
        cumulative: { total: number; admitted: number }
        daily: { new: number; admitted: number; total: number }
    }
    targetDate: string
}

interface DailyReferralDashboardProps {
    globalDateRange?: { start: string; end: string }
    globalCampus?: string
    globalAcademicYear?: string
}

export function DailyReferralDashboard({ 
    globalDateRange, 
    globalCampus = 'All', 
    globalAcademicYear = '2025-2026' 
}: DailyReferralDashboardProps) {
    const [date, setDate] = useState<string>(globalDateRange?.end || new Date().toISOString().split('T')[0])
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<ReportData | null>(null)
    const [isExporting, setIsExporting] = useState(false)

    const fetchReport = async (targetDate: string, campus: string, academicYear: string) => {
        setLoading(true)
        try {
            const res = await getDailyReferralReport({ targetDate, campus, academicYear })
            if (res.success && res.data) {
                setData(res.data)
            } else {
                toast.error('Failed to load report data')
            }
        } catch (error) {
            toast.error('An error occurred while fetching the report')
        } finally {
            setLoading(false)
        }
    }

    // Support bidirectional sync: If global filter changes, update local state
    useEffect(() => {
        if (globalDateRange?.end) {
            setDate(globalDateRange.end)
        }
    }, [globalDateRange?.end])

    // Re-fetch whenever any filter (local or global) changes
    useEffect(() => {
        fetchReport(date, globalCampus, globalAcademicYear)
    }, [date, globalCampus, globalAcademicYear])

    const handleDateChange = (newDate: string) => {
        setDate(newDate)
    }

    const prevDay = () => {
        const d = new Date(date)
        d.setDate(d.getDate() - 1)
        setDate(d.toISOString().split('T')[0])
    }

    const nextDay = () => {
        const d = new Date(date)
        d.setDate(d.getDate() + 1)
        setDate(d.toISOString().split('T')[0])
    }

    const downloadCSV = () => {
        if (!data) return
        setIsExporting(true)
        try {
            const headers = [
                'Sl No', 'Campus Name', 
                `Total Referral (as of ${new Date(date).toLocaleDateString()})`, 
                'Total Admitted (as of date)', 
                `Daily Admitted (${new Date(date).toLocaleDateString()})`, 
                `Daily New (${new Date(date).toLocaleDateString()})`, 
                'Daily Total'
            ]
            
            const rows = data.reportRows.map(r => [
                r.slNo,
                r.campusName,
                r.cumulative.total,
                r.cumulative.admitted,
                r.daily.admitted,
                r.daily.new,
                r.daily.total
            ])

            // Add Grand Total
            rows.push([
                '-',
                'GRAND TOTAL',
                data.grandTotals.cumulative.total,
                data.grandTotals.cumulative.admitted,
                data.grandTotals.daily.admitted,
                data.grandTotals.daily.new,
                data.grandTotals.daily.total
            ])

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n')

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', `daily-referral-summary-${date}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            toast.success('CSV Downloaded successfully')
        } catch (error) {
            toast.error('Failed to export CSV')
        } finally {
            setIsExporting(false)
        }
    }

    if (!data && loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <RefreshCw className="animate-spin text-blue-600" size={48} />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Aggregating Campus Data...</p>
            </div>
        )
    }

    return (
        <div className="w-full space-y-6 animate-in fade-in duration-700 pb-10">
            {/* Control Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-xl p-4 rounded-[2rem] border border-white/50 shadow-xl shadow-indigo-100/20">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-amber-200">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 italic uppercase">
                            Daily Summary
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Analysis Dashboard</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner">
                    <button 
                        onClick={prevDay}
                        className="p-2 hover:bg-white hover:text-blue-600 rounded-xl transition-all text-slate-500 hover:shadow-sm"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    
                    <div className="px-4 py-2 bg-white rounded-xl shadow-sm border border-slate-200">
                        <input 
                            type="date"
                            value={date}
                            onChange={(e) => handleDateChange(e.target.value)}
                            className="bg-transparent border-none text-sm font-black text-slate-800 focus:outline-none focus:ring-0 w-[140px] cursor-pointer"
                        />
                    </div>

                    <button 
                        onClick={nextDay}
                        disabled={date === new Date().toISOString().split('T')[0]}
                        className="p-2 hover:bg-white hover:text-blue-600 rounded-xl transition-all text-slate-500 hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={downloadCSV}
                        disabled={isExporting}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                        Download CSV
                    </button>
                    <button 
                        onClick={() => window.print()}
                        className="p-3 bg-white text-slate-700 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all shadow-sm"
                        title="Print / PDF"
                    >
                        <FileDown size={20} />
                    </button>
                </div>
            </div>

            {/* The High-Fidelity Report Table */}
            <div className="overflow-hidden bg-white rounded-[1.5rem] border-2 border-slate-900/5 shadow-2xl relative">
                <div className="overflow-x-auto min-w-[800px]">
                    <div className="w-full text-center py-6 bg-[#FFFF00] border-b-2 border-slate-900">
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight italic">Achievement Summary - {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</h1>
                    </div>

                    <table className="w-full border-collapse">
                        <thead>
                            {/* Layer 1 Headers */}
                            <tr className="border-b-2 border-slate-900">
                                <th rowSpan={2} className="px-4 py-4 bg-[#FFC000] text-slate-900 font-black uppercase text-sm border-r-2 border-slate-900 w-16 text-center">Sl No.</th>
                                <th rowSpan={2} className="px-6 py-4 bg-[#FFC000] text-slate-900 font-black uppercase text-sm border-r-2 border-slate-900 text-left">Campus Name</th>
                                <th colSpan={2} className="px-6 py-2 bg-[#DDEBF7] text-blue-900 font-black uppercase text-[11px] tracking-widest border-r-2 border-slate-900 text-center">Total Referral (as of {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })})</th>
                                <th colSpan={3} className="px-6 py-2 bg-[#E4DFEC] text-purple-900 font-black uppercase text-[11px] tracking-widest border-slate-900 text-center">Referral on {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</th>
                            </tr>
                            {/* Layer 2 Headers */}
                            <tr className="border-b-2 border-slate-900">
                                <th className="px-4 py-3 bg-[#DDEBF7] text-blue-900 font-black uppercase text-[10px] border-r border-slate-300 text-center w-32">Total</th>
                                <th className="px-4 py-3 bg-[#DDEBF7] text-blue-900 font-black uppercase text-[10px] border-r-2 border-slate-900 text-center w-32">Admitted</th>
                                
                                <th className="px-4 py-3 bg-[#E4DFEC] text-purple-900 font-black uppercase text-[10px] border-r border-slate-300 text-center w-32">Admitted</th>
                                <th className="px-4 py-3 bg-[#E4DFEC] text-purple-900 font-black uppercase text-[10px] border-r border-slate-300 text-center w-32">New</th>
                                <th className="px-4 py-3 bg-[#E4DFEC] text-purple-900 font-black uppercase text-[10px] text-center w-32">Total</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {data?.reportRows.map((row, idx) => (
                                <motion.tr 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.03 }}
                                    key={row.campusName}
                                    className="hover:bg-slate-50/80 transition-colors group"
                                >
                                    <td className="px-4 py-3 text-center font-bold text-slate-500 border-r-2 border-slate-900/5">{row.slNo}</td>
                                    <td className="px-6 py-3 font-black text-slate-800 uppercase text-xs border-r-2 border-slate-900/5 group-hover:text-blue-600 transition-colors">{row.campusName}</td>
                                    <td className="px-4 py-3 text-center font-black text-slate-700 bg-blue-50/30 border-r border-slate-100">{row.cumulative.total}</td>
                                    <td className="px-4 py-3 text-center font-black text-emerald-600 bg-emerald-50/20 border-r-2 border-slate-900/5">{row.cumulative.admitted}</td>
                                    
                                    <td className="px-4 py-3 text-center font-black text-purple-700 bg-purple-50/30 border-r border-slate-100">{row.daily.admitted}</td>
                                    <td className="px-4 py-3 text-center font-black text-slate-700 bg-slate-50/30 border-r border-slate-100">{row.daily.new}</td>
                                    <td className="px-4 py-3 text-center font-black text-slate-900 bg-slate-50/50">{row.daily.total}</td>
                                </motion.tr>
                            ))}
                        </tbody>

                        {/* Grand Total Footer */}
                        <tfoot>
                            <tr className="border-t-4 border-slate-900 bg-[#FFC000]">
                                <td colSpan={2} className="px-6 py-5 text-right font-black text-slate-900 uppercase tracking-widest text-sm border-r-2 border-slate-900">Grand Total</td>
                                <td className="px-4 py-5 text-center font-black text-slate-900 text-base border-r border-slate-900/20">{data?.grandTotals.cumulative.total}</td>
                                <td className="px-4 py-5 text-center font-black text-slate-900 text-base border-r-2 border-slate-900">{data?.grandTotals.cumulative.admitted}</td>
                                
                                <td className="px-4 py-5 text-center font-black text-slate-900 text-base border-r border-slate-900/20">{data?.grandTotals.daily.admitted}</td>
                                <td className="px-4 py-5 text-center font-black text-slate-900 text-base border-r border-slate-900/20">{data?.grandTotals.daily.new}</td>
                                <td className="px-4 py-5 text-center font-black text-slate-900 text-base">{data?.grandTotals.daily.total}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Legend / Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 border border-blue-100 p-5 rounded-3xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Snapshot View</p>
                        <p className="text-xs font-bold text-blue-700 mt-1 leading-relaxed">
                            "Total Referral" shows counts filtered by the selected Academic Year and Target Date.
                        </p>
                    </div>
                </div>

                <div className="bg-purple-50 border border-purple-100 p-5 rounded-3xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center text-white">
                        <Filter size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-purple-900 uppercase tracking-widest">Global Sync</p>
                        <p className="text-xs font-bold text-purple-700 mt-1 leading-relaxed">
                            Synced with header filters for Analysis Period, Campus, and Academic Year.
                        </p>
                    </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-3xl flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                        <Download size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest">Instant Export</p>
                        <p className="text-[10px] font-black text-indigo-600 uppercase mt-1">
                            Available as aggregated CSV & PDF
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
