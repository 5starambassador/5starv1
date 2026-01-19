'use client'

import React from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from 'recharts'
// import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

// --- Colors ---
const COLORS = {
    primary: '#D97706', // Gold
    secondary: '#B91C1C', // Red
    tertiary: '#1E40AF', // Blue
    neutral: '#9CA3AF', // Gray
    success: '#10B981', // Green
}

const PIE_COLORS = ['#D97706', '#B91C1C', '#1E40AF', '#10B981', '#F59E0B']

export interface AnalyticsChartsProps {
    admissionTrend: { date: string, leads: number, admissions: number }[]
    referrerDistribution: { name: string, value: number }[]
}

export function AnalyticsCharts({ admissionTrend = [], referrerDistribution = [] }: AnalyticsChartsProps) {
    if (!admissionTrend?.length && !referrerDistribution?.length) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-white rounded-[32px] border border-gray-100 p-6 h-[300px] flex items-center justify-center">
                    <p className="text-gray-400 font-medium">No admission data available</p>
                </div>
                <div className="bg-white rounded-[32px] border border-gray-100 p-6 h-[300px] flex items-center justify-center">
                    <p className="text-gray-400 font-medium">No referral data available</p>
                </div>
            </div>
        )
    }
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* 1. Admission Trends (Leads vs Admissions) */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] overflow-hidden p-6">
                <div className="mb-6">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Admission Velocity</h3>
                    <p className="text-[13px] font-semibold text-gray-400">Leads generated vs Confirmed admissions (Last 6 Months)</p>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={admissionTrend}
                            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis />
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                cursor={{ fill: '#F3F4F6' }}
                            />
                            <Legend />
                            <Bar dataKey="leads" name="New Leads" fill={COLORS.tertiary} radius={[4, 4, 0, 0]} barSize={30} />
                            <Bar dataKey="admissions" name="Admissions" fill={COLORS.success} radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. Referrer Distribution (Pie Chart) */}
            <div className="bg-white rounded-[32px] border border-gray-100 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] overflow-hidden p-6">
                <div className="mb-6">
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Referral Sources</h3>
                    <p className="text-[13px] font-semibold text-gray-400">Distribution of leads by Ambassador Role</p>
                </div>
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={referrerDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                    const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                                    const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                                    return (
                                        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11} fontWeight="bold">
                                            {`${(percent * 100).toFixed(0)}%`}
                                        </text>
                                    );
                                }}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {referrerDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
