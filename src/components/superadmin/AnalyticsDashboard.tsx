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
import {
    generateConversionFunnelData,
    generateFinancialROIData,
    generateTargetAchievementData,
    generateStarMilestonesData,
    generateAdmissionIntelligenceData,
    generateRetentionAnalyticsData
} from '@/app/report-actions'
import { ROIYieldCard } from './analytics/ROIYieldCard'
import { StrategicForecastCard } from './analytics/StrategicForecastCard'
import { AmbassadorStarCard } from './analytics/AmbassadorStarCard'
import { AmbassadorHealthCard } from './analytics/AmbassadorHealthCard'
import { Calendar, Zap, Loader2, Sparkles, Activity } from 'lucide-react'
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
    const [isLoadingVisual, setIsLoadingVisual] = useState(false)
    const [visualData, setVisualData] = useState<{
        funnel: any[],
        roi: any,
        achievement: any[],
        velocity: string,
        milestones: { distribution: any[], risingStars: any[] },
        intelligence: { campuses: any[], totalPredicted: number, avgVelocity: string },
        retention: { cohorts: any[], avgDaysToConfirm: string }
    }>({
        funnel: [],
        roi: null,
        achievement: [],
        velocity: '0',
        milestones: { distribution: [], risingStars: [] },
        intelligence: { campuses: [], totalPredicted: 0, avgVelocity: '0' },
        retention: { cohorts: [], avgDaysToConfirm: '0' }
    })

    useEffect(() => {
        setIsMounted(true)
    }, [])

    const fetchVisualData = async () => {
        setIsLoadingVisual(true)
        try {
            const filters = {
                startDate: dateRange.start || undefined,
                endDate: dateRange.end || undefined,
                campus: selectedCampus !== 'all' ? selectedCampus : undefined
            }

            const [funnelRes, roiRes, milestoneRes, intelligenceRes, retentionRes] = await Promise.all([
                generateConversionFunnelData(filters),
                generateFinancialROIData(filters),
                generateStarMilestonesData({ campus: filters.campus }),
                generateAdmissionIntelligenceData({ campus: filters.campus }),
                generateRetentionAnalyticsData({ campus: filters.campus })
            ])

            setVisualData({
                funnel: funnelRes.success ? (funnelRes.funnelData || []) : [],
                roi: roiRes.success ? roiRes.roi : null,
                achievement: [], // Placeholder if needed later
                velocity: funnelRes.success ? (funnelRes.avgVelocity || '0') : '0',
                milestones: (milestoneRes.success && milestoneRes.milestones) ? milestoneRes.milestones : { distribution: [], risingStars: [] },
                intelligence: intelligenceRes.success ? (intelligenceRes.intelligence || { campuses: [], totalPredicted: 0, avgVelocity: '0' }) : { campuses: [], totalPredicted: 0, avgVelocity: '0' },
                retention: retentionRes.success ? (retentionRes.retention || { cohorts: [], avgDaysToConfirm: '0' }) : { cohorts: [], avgDaysToConfirm: '0' }
            })
        } catch (error) {
            console.error('Failed to load visual insights:', error)
        } finally {
            setIsLoadingVisual(false)
        }
    }

    useEffect(() => {
        if (isMounted) {
            fetchVisualData()
        }
    }, [isMounted, selectedCampus, dateRange.start, dateRange.end])

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

            {/* Strategic Command Center Section */}
            <div className="space-y-8">
                <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                            <Zap className="text-amber-500" fill="currentColor" size={24} />
                            Strategic Insights
                        </h2>
                        <p className="text-[13px] font-bold text-gray-400 mt-1 uppercase tracking-widest">Revenue, Velocity & Network Health</p>
                    </div>
                    {isLoadingVisual && (
                        <div className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-2 rounded-full border border-blue-100 animate-pulse">
                            <Loader2 size={12} className="animate-spin" />
                            Synchronizing Intelligence...
                        </div>
                    )}
                </div>

                {!isMounted || isLoadingVisual ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="h-[450px] bg-white rounded-[32px] border border-gray-100 flex flex-col items-center justify-center p-8 text-center animate-pulse">
                            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                                <Loader2 className="text-gray-300 animate-spin" size={32} />
                            </div>
                            <div className="h-4 w-32 bg-gray-100 rounded-full mb-2" />
                            <div className="h-3 w-48 bg-gray-50 rounded-full" />
                        </div>
                        <div className="h-[450px] bg-white rounded-[32px] border border-gray-100 flex flex-col items-center justify-center p-8 text-center animate-pulse">
                            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                                <Loader2 className="text-gray-300 animate-spin" size={32} />
                            </div>
                            <div className="h-4 w-32 bg-gray-100 rounded-full mb-2" />
                            <div className="h-3 w-48 bg-gray-50 rounded-full" />
                        </div>
                        <div className="h-[450px] bg-white rounded-[32px] border border-gray-100 flex flex-col items-center justify-center p-8 text-center animate-pulse lg:col-span-1 md:col-span-2">
                            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4">
                                <Loader2 className="text-gray-300 animate-spin" size={32} />
                            </div>
                            <div className="h-4 w-32 bg-gray-100 rounded-full mb-2" />
                            <div className="h-3 w-48 bg-gray-50 rounded-full" />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* 1. ROI Card */}
                        <ROIYieldCard roi={visualData.roi} />

                        {/* 2. Forecast Card */}
                        <StrategicForecastCard intelligence={visualData.intelligence} />

                        {/* 3. Star Distribution */}
                        <div className="lg:col-span-1 md:col-span-2">
                            <AmbassadorStarCard milestones={visualData.milestones} />
                        </div>

                        {/* 4. Health & Velocity */}
                        <div className="md:col-span-2 lg:col-span-2">
                            <AmbassadorHealthCard retention={visualData.retention} />
                        </div>

                        {/* 5. Conversion Funnel (Refactored) */}
                        <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] h-full">
                            <div className="mb-6">
                                <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                                    <Activity className="text-blue-500" size={24} />
                                    Conversion Funnel
                                </h3>
                                <p className="text-[13px] font-semibold text-gray-400">Yield breakdown by stage</p>
                            </div>
                            <div className="h-[300px]">
                                <ConversionFunnelChart data={visualData.funnel.length > 0 ? visualData.funnel : [
                                    { stage: 'Total Leads', count: displayedAnalytics.totalLeads || 0 },
                                    { stage: 'Waitlist', count: (displayedAnalytics.totalLeads || 0) - (displayedAnalytics.totalConfirmed || 0) },
                                    { stage: 'Confirmed', count: displayedAnalytics.totalConfirmed || 0 }
                                ]} />
                            </div>
                            <div className="mt-6 pt-6 border-t border-gray-50 flex justify-between items-center text-[11px] font-black uppercase tracking-widest text-gray-400">
                                <span>Network Avg. Velocity</span>
                                <span className="text-emerald-500">{visualData.velocity} Days</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

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
