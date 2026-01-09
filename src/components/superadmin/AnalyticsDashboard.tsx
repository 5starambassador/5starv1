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

interface AnalyticsDashboardProps {
    analyticsData: SystemAnalytics
    trendData: { date: string; users: number }[]
    campusCompData: CampusPerformance[]
    onCampusClick: (campusName: string) => void
}

export function AnalyticsDashboard({ analyticsData: initialAnalytics, trendData, campusCompData, onCampusClick }: AnalyticsDashboardProps) {
    const [isTableExpanded, setIsTableExpanded] = useState(false)
    const [selectedCampus, setSelectedCampus] = useState<string>('all')

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
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Target className="text-blue-600" />
                    {selectedCampus === 'all' ? 'System Analytics' : `${selectedCampus} Performance`}
                </h2>
                <select
                    className="p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    value={selectedCampus}
                    onChange={(e) => setSelectedCampus(e.target.value)}
                >
                    <option value="all">All Campuses</option>
                    {campusCompData.map(c => (
                        <option key={c.campus} value={c.campus}>{c.campus}</option>
                    ))}
                </select>
            </div>

            <StatsCards analytics={displayedAnalytics} growthTrend={trendData} />

            {/* SECTION 1: SYSTEM OVERVIEW Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* User Growth */}
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]">
                    <div className="mb-6">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">User Growth Trend</h3>
                        <p className="text-[13px] font-semibold text-gray-400">Engagement velocity</p>
                    </div>
                    <div className="h-[350px]">
                        <GrowthTrendChart data={trendData} />
                    </div>
                </div>

                {/* Conversion Funnel */}
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]">
                    <div className="mb-6">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Lead Conversion Funnel</h3>
                        <p className="text-[13px] font-semibold text-gray-400">Baseline conversion</p>
                    </div>
                    <div className="h-[350px]">
                        <ConversionFunnelChart data={[
                            { stage: 'Total Leads', count: displayedAnalytics.totalLeads },
                            { stage: 'Pending', count: displayedAnalytics.totalLeads - displayedAnalytics.totalConfirmed },
                            { stage: 'Admissions', count: displayedAnalytics.totalConfirmed }
                        ]} />
                    </div>
                </div>

                {/* Role Distribution */}
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)]">
                    <div className="mb-6">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Lead Structure</h3>
                        <p className="text-[13px] font-semibold text-gray-400">User role breakdown</p>
                    </div>
                    <div className="h-[350px]">
                        <GenericPieChart data={displayedAnalytics.userRoleDistribution || []} dataKey="value" nameKey="name" />
                    </div>
                </div>

                {/* Heatmap - Full Width */}
                <div className="md:col-span-2 lg:col-span-3">
                    <RetentionHeatmap />
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
                        onCampusClick={onCampusClick}
                    />
                </div>
            </div>
        </div>
    )
}
