'use client'

import React, { useState, useEffect } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    LineChart,
    Line,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from 'recharts'

// --- Colors ---
const COLORS = {
    primary: '#D97706', // Gold
    secondary: '#B91C1C', // Red
    tertiary: '#1E40AF', // Blue
    neutral: '#9CA3AF', // Gray
    success: '#10B981', // Green
}

const PIE_COLORS = ['#D97706', '#B91C1C', '#1E40AF', '#10B981', '#F59E0B']

// --- Helper Hook ---
const useMounted = () => {
    const [mounted, setMounted] = useState(false)
    useEffect(() => setMounted(true), [])
    return mounted
}

// --- Components ---

// 1. Bar Chart (Campus Performance)
export const CampusBarChart = ({ data }: { data: any[] }) => {
    const isMounted = useMounted()
    if (!isMounted) return <div className="h-[300px] w-full bg-slate-50/50 animate-pulse rounded-2xl" />

    return (
        <div className="w-full h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="campus" type="category" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        cursor={{ fill: '#F3F4F6' }}
                    />
                    <Legend />
                    <Bar dataKey="totalLeads" name="Total Leads" fill={COLORS.primary} radius={[0, 4, 4, 0]} barSize={20} />
                    <Bar dataKey="confirmed" name="Admissions" fill={COLORS.success} radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

// 2. Funnel / Conversion Chart
export const ConversionFunnelChart = ({ data }: { data: any[] }) => {
    const isMounted = useMounted()
    if (!isMounted) return <div className="h-[300px] w-full bg-slate-50/50 animate-pulse rounded-2xl" />

    return (
        <div className="w-full h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Bar dataKey="count" name="Count" fill={COLORS.secondary} radius={[4, 4, 0, 0]} barSize={40}>
                        {
                            data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.neutral : index === 1 ? COLORS.primary : COLORS.success} />
                            ))
                        }
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

// 3. User Growth Trend (Line Chart)
export const GrowthTrendChart = ({ data }: { data: any[] }) => {
    const isMounted = useMounted()
    if (!isMounted) return <div className="h-[300px] w-full bg-slate-50/50 animate-pulse rounded-2xl" />

    return (
        <div className="w-full h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8} />
                            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <Area type="monotone" dataKey="users" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

// 4. Generic Pie Chart (Market Share / Distribution)
export const GenericPieChart = ({ data, dataKey = 'value', nameKey = 'name' }: { data: any[], dataKey?: string, nameKey?: string }) => {
    const isMounted = useMounted()
    if (!isMounted) return <div className="h-[300px] w-full bg-slate-50/50 animate-pulse rounded-2xl" />

    return (
        <div className="w-full h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ cx, cy, midAngle = 0, innerRadius, outerRadius, percent = 0, index }) => {
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                            const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                            return (
                                <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10} fontWeight="bold">
                                    {`${(percent * 100).toFixed(0)}%`}
                                </text>
                            );
                        }}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey={dataKey}
                        nameKey={nameKey}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    )
}

// 5. Campus Efficiency (Conversion Rate)
export const CampusEfficiencyChart = ({ data }: { data: any[] }) => {
    const isMounted = useMounted()
    if (!isMounted) return <div className="h-[300px] w-full bg-slate-50/50 animate-pulse rounded-2xl" />

    return (
        <div className="w-full h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                    <XAxis type="number" unit="%" domain={[0, 100]} />
                    <YAxis dataKey="campus" type="category" width={150} tick={{ fontSize: 12 }} />
                    <Tooltip
                        formatter={(value: any) => [`${value}%`, 'Conversion Rate']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    />
                    <Bar dataKey="conversionRate" name="Conv. Rate" fill={COLORS.tertiary} radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
