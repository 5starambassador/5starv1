'use client'


import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
    { name: 'Jan', revenue: 4000, payouts: 2400 },
    { name: 'Feb', revenue: 3000, payouts: 1398 },
    { name: 'Mar', revenue: 2000, payouts: 9800 },
    { name: 'Apr', revenue: 2780, payouts: 3908 },
    { name: 'May', revenue: 1890, payouts: 4800 },
    { name: 'Jun', revenue: 2390, payouts: 3800 },
    { name: 'Jul', revenue: 3490, payouts: 4300 },
]

export function FinanceOverviewChart() {
    return (
        <div className="col-span-1 md:col-span-4">
            <div className="col-span-1 md:col-span-4 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6">
                    <div className="mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Cash Flow Overview</h3>
                        <p className="text-sm text-gray-500">Revenue vs Payouts (Last 6 Months)</p>
                    </div>

                    <div className="h-[300px] w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={data}
                                margin={{
                                    top: 10,
                                    right: 30,
                                    left: 0,
                                    bottom: 0,
                                }}
                            >
                                <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#059669" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorPayouts" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#D97706" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#D97706" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 12 }}
                                    tickFormatter={(value) => `₹${value / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#059669"
                                    fillOpacity={1}
                                    fill="url(#colorRevenue)"
                                    strokeWidth={3}
                                    name="Revenue"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="payouts"
                                    stroke="#D97706"
                                    fillOpacity={1}
                                    fill="url(#colorPayouts)"
                                    strokeWidth={3}
                                    name="Payouts"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    )
}
