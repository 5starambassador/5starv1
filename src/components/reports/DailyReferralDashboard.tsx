'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, RefreshCw, ChevronLeft, ChevronRight, Download, Filter, TrendingUp, FileDown, Image as ImageIcon } from 'lucide-react'
import { getDailyReferralReport } from '@/app/report-actions'
import { toPng } from 'html-to-image'
import { toast } from 'sonner'
import { useRef } from 'react'

interface ReportRows {
    slNo: number
    campusName: string
    potential: number
    achievement: number
    conversion: number
    cumulative: { total: number; admitted: number }
    daily: { new: number; admitted: number; total: number }
}

interface GroupSubtotal {
    potential: number
    achievement: number
    conversion: number
    cumulative: { total: number; admitted: number }
    daily: { new: number; admitted: number; total: number }
}

interface ReportData {
    schoolRows: ReportRows[]
    schoolSubtotal: GroupSubtotal
    collegeRows: ReportRows[]
    collegeSubtotal: GroupSubtotal
    grandTotals: GroupSubtotal
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
    const [isImageExporting, setIsImageExporting] = useState(false)
    const reportRef = useRef<HTMLDivElement>(null)

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
                'Sl No', 'Campus Name', 'Potential Referrals', '% Achieved',
                'Total Referral (Cumulative)', 
                'Total Admitted (Cumulative)', 
                '% Conversion',
                `Daily Admitted (${new Date(date).toLocaleDateString()})`, 
                `Daily New (${new Date(date).toLocaleDateString()})`, 
                'Daily Total'
            ]
            
            const rows: any[] = []
            
            // Add Schools
            data.schoolRows.forEach(r => {
                rows.push([
                    r.slNo,
                    `"${r.campusName}"`,
                    r.potential || 0,
                    `${(r.achievement || 0).toFixed(1)}%`,
                    r.cumulative.total,
                    r.cumulative.admitted,
                    `${(r.conversion || 0).toFixed(1)}%`,
                    r.daily.admitted,
                    r.daily.new,
                    r.daily.total
                ])
            })
            
            // School Subtotal
            rows.push([
                '-',
                'SCHOOL SUBTOTAL',
                data.schoolSubtotal.potential || 0,
                `${(data.schoolSubtotal.achievement || 0).toFixed(1)}%`,
                data.schoolSubtotal.cumulative.total,
                data.schoolSubtotal.cumulative.admitted,
                `${(data.schoolSubtotal.conversion || 0).toFixed(1)}%`,
                data.schoolSubtotal.daily.admitted,
                data.schoolSubtotal.daily.new,
                data.schoolSubtotal.daily.total
            ])

            // Add Colleges
            data.collegeRows.forEach(r => {
                rows.push([
                    r.slNo,
                    `"${r.campusName}"`,
                    r.potential || 0,
                    `${(r.achievement || 0).toFixed(1)}%`,
                    r.cumulative.total,
                    r.cumulative.admitted,
                    `${(r.conversion || 0).toFixed(1)}%`,
                    r.daily.admitted,
                    r.daily.new,
                    r.daily.total
                ])
            })

            // College Subtotal
            rows.push([
                '-',
                'COLLEGE SUBTOTAL',
                data.collegeSubtotal.potential || 0,
                `${(data.collegeSubtotal.achievement || 0).toFixed(1)}%`,
                data.collegeSubtotal.cumulative.total,
                data.collegeSubtotal.cumulative.admitted,
                `${(data.collegeSubtotal.conversion || 0).toFixed(1)}%`,
                data.collegeSubtotal.daily.admitted,
                data.collegeSubtotal.daily.new,
                data.collegeSubtotal.daily.total
            ])

            // Add Grand Total
            rows.push([
                '-',
                'GRAND TOTAL',
                data.grandTotals.potential || 0,
                `${(data.grandTotals.achievement || 0).toFixed(1)}%`,
                data.grandTotals.cumulative.total,
                data.grandTotals.cumulative.admitted,
                `${(data.grandTotals.conversion || 0).toFixed(1)}%`,
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

    const downloadImage = async () => {
        if (!reportRef.current || !data) return
        setIsImageExporting(true)
        try {
            // Wait a small bit for any animations to settle
            await new Promise(resolve => setTimeout(resolve, 100))
            
            const dataUrl = await toPng(reportRef.current, { 
                quality: 1.0, 
                backgroundColor: '#ffffff',
                cacheBust: true,
                skipFonts: true, // Prevents fetch errors when capturing fonts
                style: {
                    borderRadius: '0' 
                },
                // Skip external CSS that might cause fetch errors
                filter: (node) => {
                    const exclusionClasses = ['print-hidden']
                    if (node.classList) {
                        return !exclusionClasses.some(cls => node.classList.contains(cls))
                    }
                    return true
                }
            })
            
            const link = document.createElement('a')
            link.download = `achievement-summary-${date}.png`
            link.href = dataUrl
            link.click()
            toast.success('Image Downloaded successfully')
        } catch (error) {
            console.error('Image Export Error:', error)
            toast.error('Failed to export as Image')
        } finally {
            setIsImageExporting(false)
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
        <div id="daily-referral-report" className="w-full space-y-6 animate-in fade-in duration-700 pb-10">
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4 portrait !important;
                        margin: 0 !important;
                    }

                    /* NUCLEAR RESET: Hide everything on the entire website */
                    body * {
                        visibility: hidden !important;
                    }
                    /* SURGICAL REVEAL: Show ONLY the report and its contents */
                    #daily-referral-report, #daily-referral-report * {
                        visibility: visible !important;
                    }
                    
                    /* THE ONE-PAGE LOCK: Force the browser to only acknowledge one page */
                    html, body {
                        height: 100% !important;
                        max-height: 297mm !important;
                        overflow: clip !important; /* Physically prevents Page 2 */
                        margin: 0 !important;
                        padding: 0 !important;
                        background: white !important;
                    }

                    #__next, [class*="layout"], [class*="MainLayout"], main {
                        height: 0 !important;
                        min-height: 0 !important;
                        overflow: visible !important;
                        background: white !important;
                    }

                    /* POSITIONING THE REPORT AT THE ABSOLUTE ZERO ORIGIN */
                    #daily-referral-report {
                        display: block !important;
                        position: fixed !important;
                        top: -35mm !important; /* TRIPLE SNAP TO THE TOP */
                        left: 0 !important;
                        width: 210mm !important;
                        margin: 0 !important;
                        padding: 0 15mm 0 15mm !important;
                        background: white !important;
                        zoom: 0.82 !important; 
                        box-sizing: border-box !important;
                        z-index: 2147483647 !important;
                    }

                    /* VIVID COLOUR ENFORCEMENT */
                    #daily-referral-report * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                        opacity: 1 !important;
                    }

                    /* EXECUTIVE TABLE STYLING */
                    table {
                        width: 100% !important;
                        border-collapse: collapse !important;
                        font-size: 8.5pt !important;
                        border: 1.5px solid #000 !important;
                        background: white !important;
                        margin-bottom: 0 !important;
                    }
                    th {
                        background-color: #f1f5f9 !important;
                        border: 1px solid #000 !important;
                        padding: 4px !important;
                        font-weight: 900 !important;
                    }
                    td {
                        border: 1px solid #777 !important;
                        padding: 2px 4px !important;
                        line-height: 1.1 !important;
                        color: #000 !important;
                        font-weight: 700 !important;
                    }
                    .report-print-container h1 {
                        font-size: 17pt !important;
                        margin: 0 0 5mm 0 !important;
                        text-align: center !important;
                        font-weight: 900 !important;
                        color: #000 !important;
                        text-transform: uppercase !important;
                    }
                    tfoot td {
                        background-color: #FFC000 !important; /* VIVID ACHARIYA YELLOW */
                        font-weight: 900 !important;
                        border-top: 2.5px solid #000 !important;
                        padding: 5px !important;
                        color: #000 !important;
                    }
                }
            `}</style>













            {/* Control Bar */}
            <div className="control-bar flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-xl p-4 rounded-[2rem] border border-white/50 shadow-xl shadow-indigo-100/20 print:hidden">
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
                        onClick={downloadImage}
                        disabled={isImageExporting}
                        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                        title="Download as Image (PNG)"
                    >
                        {isImageExporting ? <RefreshCw size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                        Save as Image
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
            <div ref={reportRef} className="report-print-container overflow-hidden bg-white rounded-[1.5rem] border-2 border-slate-900/5 shadow-2xl relative print:border-none print:shadow-none">
                <div className="overflow-x-auto min-w-[800px] print:min-w-0 print:overflow-visible">
                    <div className="w-full text-center py-6 bg-[#FFFF00] border-b-2 border-slate-900 print:py-2">
                        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight italic print:text-xl">Achievement Summary - {new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</h1>
                    </div>

                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-900 border-t-4 border-slate-900">
                                <th rowSpan={2} className="px-4 py-1 text-center text-[10px] font-black text-slate-900 uppercase tracking-wider border-r-2 border-slate-900/10 min-w-[50px] bg-[#FFC000]">Sl No.</th>
                                <th rowSpan={2} className="px-6 py-1 text-left text-[10px] font-black text-slate-900 uppercase tracking-wider border-r-2 border-slate-900/10 min-w-[150px] bg-[#FFC000]">Campus Name</th>
                                <th rowSpan={2} className="px-4 py-1 text-center text-[10px] font-black text-slate-800 uppercase tracking-wider border-r-2 border-slate-900/10 w-24 bg-[#FFF2CC]">Potential<br/>Referrals</th>
                                <th rowSpan={2} className="px-4 py-1 text-center text-[10px] font-black text-slate-900 uppercase tracking-wider border-r-2 border-slate-900/10 w-24 bg-[#FFF2CC]">%<br/>Achieved</th>
                                
                                <th colSpan={3} className="px-4 py-1 bg-[#DDEBF7] text-blue-900 font-extrabold uppercase text-[10px] border-r-2 border-slate-900 border-b-2 tracking-tight text-center">Total Referral (As of {new Date(date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })})</th>
                                <th colSpan={3} className="px-4 py-1 bg-[#E4DFEC] text-purple-900 font-extrabold uppercase text-[10px] tracking-tight text-center">Referral on {new Date(date).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' })}</th>
                            </tr>
                            {/* Layer 2 Headers */}
                            <tr className="border-b-2 border-slate-900">
                                <th className="px-4 py-1 bg-[#DDEBF7] text-blue-900 font-black uppercase text-[10px] border-r border-slate-300 text-center w-28">Total</th>
                                <th className="px-4 py-1 bg-[#DDEBF7] text-blue-900 font-black uppercase text-[10px] border-r border-slate-300 text-center w-28">Admitted</th>
                                <th className="px-4 py-1 bg-[#DDEBF7] text-blue-900 font-black uppercase text-[10px] border-r-2 border-slate-900 text-center w-28">% Conv.</th>
                                
                                <th className="px-4 py-1 bg-[#E4DFEC] text-purple-900 font-black uppercase text-[10px] border-r border-slate-300 text-center w-32">Admitted</th>
                                <th className="px-4 py-1 bg-[#E4DFEC] text-purple-900 font-black uppercase text-[10px] border-r border-slate-300 text-center w-32">New</th>
                                <th className="px-4 py-1 bg-[#E4DFEC] text-purple-900 font-black uppercase text-[10px] text-center w-32">Total</th>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                            {/* SCHOOLS */}
                            {data?.schoolRows.map((row, idx) => (
                                <motion.tr 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.02 }}
                                    key={row.campusName}
                                    className="hover:bg-slate-50/80 transition-colors group"
                                >
                                    <td className="px-4 py-1 text-center font-bold text-slate-500 border-r-2 border-slate-900/5">{row.slNo}</td>
                                    <td className="px-6 py-1 font-black text-slate-800 uppercase text-[10px] border-r-2 border-slate-900/5 group-hover:text-blue-600 transition-colors leading-tight">{row.campusName}</td>
                                    <td className="px-4 py-1 text-center font-black text-orange-800 bg-[#FFF2CC] border-r-2 border-slate-900/5">{row.potential || 0}</td>
                                    <td className="px-4 py-1 text-center font-black text-orange-950 bg-[#FFF2CC] border-r-2 border-slate-900/5">{(row.achievement || 0).toFixed(1)}%</td>
                                    <td className="px-4 py-1 text-center font-black text-slate-700 bg-blue-50/30 border-r border-slate-100">{row.cumulative.total}</td>
                                    <td className="px-4 py-1 text-center font-black text-emerald-600 bg-emerald-50/20 border-r border-slate-100">{row.cumulative.admitted}</td>
                                    <td className="px-4 py-1 text-center font-black text-blue-900 bg-blue-50/50 border-r-2 border-slate-900/5">{(row.conversion || 0).toFixed(1)}%</td>
                                    
                                    <td className="px-4 py-1 text-center font-black text-purple-700 bg-purple-50/30 border-r border-slate-100">{row.daily.admitted}</td>
                                    <td className="px-4 py-1 text-center font-black text-slate-700 bg-slate-50/30 border-r border-slate-100">{row.daily.new}</td>
                                    <td className="px-4 py-1 text-center font-black text-slate-900 bg-slate-50/50">{row.daily.total}</td>
                                </motion.tr>
                            ))}
                            
                            {/* SCHOOL SUBTOTAL */}
                            <tr className="bg-amber-200 border-y-2 border-slate-900">
                                <td colSpan={2} className="px-6 py-1.5 text-right font-black text-amber-900 uppercase tracking-wider text-[10px] border-r-2 border-slate-900/5">School Subtotal</td>
                                <td className="px-4 py-1.5 text-center font-black text-slate-900 bg-[#FFF2CC]/80 border-r-2 border-slate-900/5">{data?.schoolSubtotal.potential}</td>
                                <td className="px-4 py-1.5 text-center font-black text-slate-900 bg-[#FFF2CC]/80 border-r-2 border-slate-900/5">{(data?.schoolSubtotal.achievement || 0).toFixed(1)}%</td>
                                <td className="px-4 py-1.5 text-center font-black text-slate-900 border-r border-slate-200">{data?.schoolSubtotal.cumulative.total}</td>
                                <td className="px-4 py-1.5 text-center font-black text-slate-900 border-r border-slate-200">{data?.schoolSubtotal.cumulative.admitted}</td>
                                <td className="px-4 py-1.5 text-center font-black text-slate-900 border-r-2 border-slate-900/5">{(data?.schoolSubtotal.conversion || 0).toFixed(1)}%</td>
                                <td className="px-4 py-1.5 text-center font-black text-slate-900 border-r border-slate-200">{data?.schoolSubtotal.daily.admitted}</td>
                                <td className="px-4 py-1.5 text-center font-black text-slate-900 border-r border-slate-200">{data?.schoolSubtotal.daily.new}</td>
                                <td className="px-4 py-1.5 text-center font-black text-slate-900">{data?.schoolSubtotal.daily.total}</td>
                            </tr>

                            {/* COLLEGES */}
                            {data?.collegeRows.map((row, idx) => (
                                <motion.tr 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: (data?.schoolRows.length || 0 + idx) * 0.02 }}
                                    key={row.campusName}
                                    className="hover:bg-slate-50/80 transition-colors group"
                                >
                                    <td className="px-4 py-1.5 text-center font-bold text-slate-500 border-r-2 border-slate-900/5">{row.slNo}</td>
                                    <td className="px-6 py-1.5 font-black text-slate-800 uppercase text-xs border-r-2 border-slate-900/5 group-hover:text-blue-600 transition-colors">{row.campusName}</td>
                                    <td className="px-4 py-1.5 text-center font-black text-orange-700 bg-orange-50/20 border-r-2 border-slate-900/5">{row.potential || 0}</td>
                                    <td className="px-4 py-1.5 text-center font-black text-orange-900 bg-orange-50/30 border-r-2 border-slate-900/5">{(row.achievement || 0).toFixed(1)}%</td>
                                    <td className="px-4 py-1.5 text-center font-black text-slate-700 bg-blue-50/30 border-r border-slate-100">{row.cumulative.total}</td>
                                    <td className="px-4 py-1.5 text-center font-black text-emerald-600 bg-emerald-50/20 border-r border-slate-100">{row.cumulative.admitted}</td>
                                    <td className="px-4 py-1.5 text-center font-black text-blue-900 bg-blue-50/50 border-r-2 border-slate-900/5">{(row.conversion || 0).toFixed(1)}%</td>
                                    
                                    <td className="px-4 py-1.5 text-center font-black text-purple-700 bg-purple-50/30 border-r border-slate-100">{row.daily.admitted}</td>
                                    <td className="px-4 py-1.5 text-center font-black text-slate-700 bg-slate-50/30 border-r border-slate-100">{row.daily.new}</td>
                                    <td className="px-4 py-1.5 text-center font-black text-slate-900 bg-slate-50/50">{row.daily.total}</td>
                                </motion.tr>
                            ))}

                            {/* COLLEGE SUBTOTAL */}
                            <tr className="bg-indigo-100 border-y-2 border-slate-900">
                                <td colSpan={2} className="px-6 py-1.5 text-right font-black text-indigo-900 uppercase tracking-wider text-[10px] border-r-2 border-slate-900/5">College Subtotal</td>
                                <td className="px-4 py-1.5 text-center font-black text-slate-900 bg-[#FFF2CC]/80 border-r-2 border-slate-900/5">{data?.collegeSubtotal.potential}</td>
                                <td className="px-4 py-1.5 text-center font-black text-slate-900 bg-[#FFF2CC]/80 border-r-2 border-slate-900/5">{(data?.collegeSubtotal.achievement || 0).toFixed(1)}%</td>
                                <td className="px-4 py-1.5 text-center font-black text-slate-900 border-r border-slate-200">{data?.collegeSubtotal.cumulative.total}</td>
                                <td className="px-4 py-1.5 text-center font-black text-slate-900 border-r border-slate-200">{data?.collegeSubtotal.cumulative.admitted}</td>
                                <td className="px-4 py-1.5 text-center font-black text-slate-900 border-r-2 border-slate-900/5">{(data?.collegeSubtotal.conversion || 0).toFixed(1)}%</td>
                                <td className="px-4 py-1.5 text-center font-black text-slate-900 border-r border-slate-200">{data?.collegeSubtotal.daily.admitted}</td>
                                <td className="px-4 py-1.5 text-center font-black text-slate-900 border-r border-slate-200">{data?.collegeSubtotal.daily.new}</td>
                                <td className="px-4 py-1.5 text-center font-black text-slate-900">{data?.collegeSubtotal.daily.total}</td>
                            </tr>
                        </tbody>

                        {/* Grand Total Footer */}
                        <tfoot>
                            <tr className="bg-amber-400 border-t-4 border-slate-900 border-b-2">
                                <td colSpan={2} className="px-6 py-2 text-right font-black text-slate-900 uppercase tracking-widest text-sm border-r-2 border-slate-900/10">Grand Total</td>
                                <td className="px-4 py-2 text-center font-black text-slate-900 text-sm border-r-2 border-slate-900/10 bg-[#FFF2CC]">{data?.grandTotals.potential || 0}</td>
                                <td className="px-4 py-2 text-center font-black text-slate-900 text-sm border-r-4 border-slate-900/20 bg-[#FFF2CC]">{(data?.grandTotals.achievement || 0).toFixed(1)}%</td>
                                <td className="px-4 py-2 text-center font-black text-slate-900 text-sm border-r border-slate-900/10 bg-amber-500/90">{data?.grandTotals.cumulative.total}</td>
                                <td className="px-4 py-2 text-center font-black text-slate-900 text-sm border-r border-slate-900/10 bg-amber-500/90">{data?.grandTotals.cumulative.admitted}</td>
                                <td className="px-4 py-2 text-center font-black text-slate-900 text-sm border-r-4 border-slate-900/20 bg-blue-200">{(data?.grandTotals.conversion || 0).toFixed(1)}%</td>
                                <td className="px-4 py-2 text-center font-black text-slate-900 text-sm border-r border-slate-900/10 bg-amber-500">{data?.grandTotals.daily.admitted}</td>
                                <td className="px-4 py-2 text-center font-black text-slate-900 text-sm border-r border-slate-900/10 bg-amber-500">{data?.grandTotals.daily.new}</td>
                                <td className="px-4 py-2 text-center font-black text-slate-900 text-sm bg-amber-500">{data?.grandTotals.daily.total}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Legend / Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
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
