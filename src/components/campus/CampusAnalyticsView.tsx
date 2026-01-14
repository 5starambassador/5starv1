'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowUpRight, ArrowDownRight, TrendingUp, Activity } from 'lucide-react'
import { DateRangeSelector } from '@/app/(main)/campus/date-range-selector'

interface CampusAnalyticsViewProps {
    stats: any
    campusName: string
    currentDays: number
}

export function CampusAnalyticsView({ stats, campusName, currentDays }: CampusAnalyticsViewProps) {

    // Helper for comparison percentages
    const getChange = (current: number, previous: number) => {
        if (!previous) return null
        const diff = ((current - previous) / previous) * 100
        return {
            value: Math.abs(diff).toFixed(0),
            isIncrease: diff >= 0
        }
    }

    const leadChange = getChange(stats?.newReferrals || 0, stats?.prevNewReferrals || 0)
    const admissionChange = getChange(stats?.confirmedAdmissions || 0, stats?.prevConfirmedAdmissions || 0)

    const conversionRate = stats?.leadsNew ?
        (((stats.leadsConfirmed || 0) / (stats.leadsNew + stats.leadsFollowup + stats.leadsConfirmed || 1) * 100).toFixed(1)) : 0

    const engagementRate = stats?.leadsNew ?
        (((stats.leadsFollowup || 0) / (stats.leadsNew + stats.leadsFollowup + stats.leadsConfirmed) * 100).toFixed(0)) : 0

    return (
        <div className="space-y-6 animate-fade-in text-gray-900">
            <Link href="/campus" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm font-medium">
                <ArrowLeft size={16} /> Back to Home
            </Link>

            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-maroon to-primary-gold">
                        Campus Analytics
                    </h1>
                    <p className="text-gray-500 mt-1">Strategic overview for {campusName || 'All Campuses'}</p>
                </div>
                <DateRangeSelector currentDays={currentDays} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white">
                    <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Total Students</p>
                    <p className="text-3xl font-extrabold mt-1">{stats?.totalStudents || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white">
                    <p className="text-purple-100 text-xs font-medium uppercase tracking-wider">New Leads</p>
                    <div className="flex items-end gap-2">
                        <p className="text-3xl font-extrabold mt-1">{stats?.newReferrals || 0}</p>
                        {leadChange && (
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded bg-white/20 mb-1 ${leadChange.isIncrease ? 'text-green-300' : 'text-red-300'}`}>
                                {leadChange.isIncrease ? '↑' : '↓'} {leadChange.value}%
                            </span>
                        )}
                    </div>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
                    <p className="text-orange-100 text-xs font-medium uppercase tracking-wider">Pending</p>
                    <p className="text-3xl font-extrabold mt-1">{stats?.pendingAdmissions || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-5 text-white">
                    <p className="text-green-100 text-xs font-medium uppercase tracking-wider">Confirmed</p>
                    <div className="flex items-end gap-2">
                        <p className="text-3xl font-extrabold mt-1">{stats?.confirmedAdmissions || 0}</p>
                        {admissionChange && (
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded bg-white/20 mb-1 ${admissionChange.isIncrease ? 'text-green-300' : 'text-red-300'}`}>
                                {admissionChange.isIncrease ? '↑' : '↓'} {admissionChange.value}%
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pipeline Funnel */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="text-primary-maroon" size={20} />
                        <h3 className="font-bold text-gray-900 text-lg">Lead Pipeline Funnel</h3>
                    </div>

                    <div className="flex flex-col gap-1">
                        <div className="relative">
                            <div className="bg-blue-500 rounded-xl p-4 text-white flex justify-between items-center z-10 relative">
                                <div className="flex flex-col">
                                    <span className="text-blue-100 text-xs font-semibold uppercase tracking-wider">New Leads</span>
                                    <span className="text-2xl font-bold">{stats?.leadsNew || 0}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-blue-100 block opacity-80">Top of Funnel</span>
                                    <span className="text-sm font-medium">100%</span>
                                </div>
                            </div>
                            <div className="flex justify-center -my-1 h-6 items-center">
                                <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[10px] border-t-blue-500 opacity-40"></div>
                            </div>
                        </div>

                        <div className="relative scale-[0.9] origin-center -mt-2">
                            <div className="bg-orange-500 rounded-xl p-4 text-white flex justify-between items-center z-10 relative">
                                <div className="flex flex-col">
                                    <span className="text-orange-100 text-xs font-semibold uppercase tracking-wider">Follow-up</span>
                                    <span className="text-2xl font-bold">{stats?.leadsFollowup || 0}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-orange-100 block opacity-80">Engagement</span>
                                    <span className="text-sm font-medium">
                                        {engagementRate}%
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-center -my-1 h-6 items-center">
                                <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[10px] border-t-orange-500 opacity-40"></div>
                            </div>
                        </div>

                        <div className="relative scale-[0.8] origin-center -mt-4">
                            <div className="bg-green-600 rounded-xl p-4 text-white flex justify-between items-center z-10 relative shadow-lg ring-4 ring-green-100">
                                <div className="flex flex-col">
                                    <span className="text-green-100 text-xs font-semibold uppercase tracking-wider">Converted</span>
                                    <span className="text-2xl font-bold">{stats?.leadsConfirmed || 0}</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs text-green-100 block opacity-80">Win Rate</span>
                                    <span className="text-sm font-medium">
                                        {conversionRate}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Activity size={18} className="text-blue-500" />
                        Performance Summary
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Current Period Leads</p>
                                <p className="text-xl font-bold text-gray-900">{stats?.newReferrals || 0}</p>
                            </div>
                            {leadChange && (
                                <div className={`flex items-center gap-1 font-bold ${leadChange.isIncrease ? 'text-green-600' : 'text-red-500'}`}>
                                    {leadChange.isIncrease ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                    {leadChange.value}%
                                </div>
                            )}
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                            <div>
                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Conversions</p>
                                <p className="text-xl font-bold text-gray-900">{stats?.confirmedAdmissions || 0}</p>
                            </div>
                            {admissionChange && (
                                <div className={`flex items-center gap-1 font-bold ${admissionChange.isIncrease ? 'text-green-600' : 'text-red-500'}`}>
                                    {admissionChange.isIncrease ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                    {admissionChange.value}%
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
