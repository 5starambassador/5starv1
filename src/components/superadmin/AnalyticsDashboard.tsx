'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { StatsCards } from '@/components/superadmin/StatsCards'
import { CampusPerformanceTable } from '@/components/superadmin/CampusPerformanceTable'
import { CampusBarChart, ConversionFunnelChart, GrowthTrendChart, GenericPieChart, CampusEfficiencyChart } from '@/components/analytics/analytics-components'
import { SystemAnalytics, CampusPerformance } from '@/types'
import { TrendingUp, Target, Users, CheckCircle } from 'lucide-react'

// Dynamic Imports related to this view
const RetentionHeatmap = dynamic(() => import('@/components/analytics/RetentionHeatmap').then(m => m.RetentionHeatmap), {
    ssr: false,
    loading: () => <div className="h-96 w-full animate-pulse bg-gray-100 rounded-3xl" />
})

import { AnalyticsCharts } from '@/components/superadmin/AnalyticsCharts'
import { toast } from 'sonner'

import { Calendar, Loader2, Sparkles, Activity } from 'lucide-react'
import { useEffect } from 'react'

interface AnalyticsDashboardProps {
    analyticsData: SystemAnalytics
    trendData: { date: string; users: number }[]
    campusCompData: CampusPerformance[]
    deepTrends?: any
}

export function AnalyticsDashboard({ analyticsData: initialAnalytics, trendData, campusCompData, deepTrends }: AnalyticsDashboardProps) {
    const [isTableExpanded, setIsTableExpanded] = useState(false)
    const [selectedCampus, setSelectedCampus] = useState<string>('all')
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' })
    const [isMounted, setIsMounted] = useState(false)

    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Filter logic
    const displayedAnalytics = selectedCampus === 'all'
        ? initialAnalytics
        : (() => {
            const campusPerf = campusCompData.find(c => c.campus === selectedCampus)
            if (!campusPerf) return initialAnalytics

            return {
                ...initialAnalytics,
                totalLeads: campusPerf.totalLeads,
                totalConfirmed: campusPerf.confirmed,
                globalConversionRate: campusPerf.conversionRate,
                totalAmbassadors: (campusPerf.staffCount || 0) + (campusPerf.parentCount || 0),
                userRoleDistribution: campusPerf.roleDistribution || [],
                staffCount: campusPerf.staffCount || 0,
                parentCount: campusPerf.parentCount || 0,
                alumniCount: campusPerf.alumniCount || 0,
                othersCount: campusPerf.othersCount || 0,
                totalStudents: campusPerf.totalStudents || 0,
                avgLeadsPerAmbassador: campusPerf.ambassadors > 0 ? Number((campusPerf.totalLeads / campusPerf.ambassadors).toFixed(2)) : 0,
                totalEstimatedRevenue: campusPerf.confirmed * 60000,
                systemWideBenefits: campusPerf.systemWideBenefits || 0,
                prevBenefits: campusPerf.prevBenefits || 0,
                prevAmbassadors: 0, // Not explicitly tracked per campus yet but could be derived
                prevLeads: campusPerf.prevLeads || 0,
                prevConfirmed: campusPerf.prevConfirmed || 0,
                // Other fields stay global or need estimation if not available in CampusPerformance
            }
        })()

    const displayedCampusData = selectedCampus === 'all'
        ? campusCompData
        : campusCompData.filter(c => c.campus === selectedCampus)

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative z-20">
                <h2 className="text-xl font-black flex items-center gap-2 text-gray-900 tracking-tight">
                    <Target className="text-blue-600" />
                    {selectedCampus === 'all' ? 'System Command Center' : `${selectedCampus} View`}
                </h2>

                <div className="flex items-center gap-4">
                    {/* Period Filter */}
                    <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5">
                        <Calendar size={14} className="text-gray-400" />
                        <input
                            type="date"
                            className="bg-transparent text-[11px] font-bold text-gray-700 focus:outline-none w-24"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            suppressHydrationWarning
                        />
                        <span className="text-gray-300">-</span>
                        <input
                            type="date"
                            className="bg-transparent text-[11px] font-bold text-gray-700 focus:outline-none w-24"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            suppressHydrationWarning
                        />
                    </div>

                    <select
                        className="p-2.5 border border-gray-200 rounded-xl bg-gray-50 text-xs font-black uppercase tracking-tight focus:ring-4 focus:ring-blue-50 outline-none cursor-pointer"
                        value={selectedCampus}
                        onChange={(e) => setSelectedCampus(e.target.value)}
                        suppressHydrationWarning={true}
                    >
                        <option value="all">Global Network</option>
                        {campusCompData.map(c => (
                            <option key={c.campus} value={c.campus}>{c.campus}</option>
                        ))}
                    </select>
                </div>
            </div>

            <StatsCards analytics={displayedAnalytics} growthTrend={trendData} />



            {/* Operational & Growth Trends Section */}
            <div className="pt-12 border-t border-gray-100 space-y-8">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <TrendingUp className="text-blue-600" size={24} />
                        Growth & Distribution
                    </h2>
                    <p className="text-[13px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Network expansion and demographic structure</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* User Growth */}
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]">
                        <div className="mb-6">
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Growth Velocity</h3>
                            <p className="text-[13px] font-semibold text-gray-400">Ambassador registration trend</p>
                        </div>
                        <div className="h-[350px]">
                            {isMounted && <GrowthTrendChart data={trendData} />}
                        </div>
                    </div>

                    {/* Role Distribution */}
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]">
                        <div className="mb-6">
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Lead Structure</h3>
                            <p className="text-[13px] font-semibold text-gray-400">Referrer role breakdown</p>
                        </div>
                        <div className="h-[350px]">
                            {isMounted && <GenericPieChart data={displayedAnalytics.userRoleDistribution || []} dataKey="value" nameKey="name" />}
                        </div>
                    </div>

                    {/* Heatmap - Full Width */}
                    <div className="lg:col-span-2">
                        {isMounted && <RetentionHeatmap campus={selectedCampus} />}
                    </div>
                </div>
            </div>

            {/* SECTION 2: CAMPUS BENCHMARKS */}
            <div className="pt-8 border-t border-gray-200">
                <h2 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
                    <Target className="text-blue-600" size={28} />
                    Campus Management
                </h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Enrollment Mix */}
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]">
                        <div className="mb-6">
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Campus Enrollment Mix</h3>
                            <p className="text-[13px] font-semibold text-gray-400">Yield distribution across achariya network</p>
                        </div>
                        <div className="h-[350px]">
                            <CampusBarChart data={displayedCampusData} />
                        </div>
                    </div>

                    {/* Efficiency Chart */}
                    <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]">
                        <div className="mb-6">
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">Conversion Efficiency (%)</h3>
                            <p className="text-[13px] font-semibold text-gray-400">Performance by campus</p>
                        </div>
                        <div className="h-[350px]">
                            <CampusEfficiencyChart data={displayedCampusData || []} />
                        </div>
                    </div>
                </div>

                {/* Full Width Table */}
                <div className="bg-white rounded-[32px] border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-8 border-b border-gray-100">
                        <h3 className="text-xl font-black text-gray-900">Detailed Campus Comparison</h3>
                        <p className="text-sm text-gray-500 mt-1">Comprehensive breakdown of leads and admissions</p>
                    </div>
                    <CampusPerformanceTable
                        comparison={displayedCampusData}
                        isExpanded={isTableExpanded}
                        onToggleExpand={() => setIsTableExpanded(!isTableExpanded)}
                    />
                </div>
            </div>
        </div>
    )
}
