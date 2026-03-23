import { getFinanceStats, getRegistrationTransactions, getSettlements, getAccruedPayoutLiabilities, getUsersReadyForRefund } from '@/app/finance-actions'

export const dynamic = 'force-dynamic'

export default async function DebugFinancePage() {
    const results: any[] = []
    const year = '2026-2027'

    async function timeAction(name: string, fn: () => Promise<any>) {
        const start = Date.now()
        try {
            const res = await fn()
            const end = Date.now()
            results.push({ name, time: end - start, success: res.success, count: res.data?.length || res.stats?.totalCount || 0 })
        } catch (err: any) {
            results.push({ name, error: err.message })
        }
    }

    // Sequence them to find the specific one that hangs
    await timeAction('getFinanceStats', () => getFinanceStats(year))
    await timeAction('getRegistrationTransactions', () => getRegistrationTransactions('All', year, ''))
    await timeAction('getSettlements', () => getSettlements('All', year, ''))
    await timeAction('getUsersReadyForRefund', () => getUsersReadyForRefund(year))
    await timeAction('getAccruedPayoutLiabilities', () => getAccruedPayoutLiabilities(year, ''))

    return (
        <div className="p-10 font-mono">
            <h1 className="text-2xl font-bold mb-4">Finance Performance Debug</h1>
            <table className="w-full border-collapse border border-gray-300">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border p-2">Function</th>
                        <th className="border p-2">Time (ms)</th>
                        <th className="border p-2">Count/Status</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((r, i) => (
                        <tr key={i}>
                            <td className="border p-2 font-bold">{r.name}</td>
                            <td className={`border p-2 ${r.time > 2000 ? 'text-red-500 font-bold' : ''}`}>{r.time}ms</td>
                            <td className="border p-2">{r.error ? `ERR: ${r.error}` : `Success (${r.count})`}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="mt-10 p-4 bg-gray-50 rounded">
                <p>Total Server execution time: {results.reduce((acc, r) => acc + (r.time || 0), 0)}ms</p>
                {results.some(r => r.time > 5000) && <p className="text-red-600 font-bold mt-2">MAJOR BOTTLENECK DETECTED!</p>}
            </div>
        </div>
    )
}
