import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export default async function TestPage() {
    const userId = 13373
    const dbUrl = process.env.DATABASE_URL
    
    // Direct Query
    const pCount = await prisma.payment.count({ where: { userId } })
    const pFirst = await prisma.payment.findFirst({ where: { userId } })
    
    // Relation Query
    const user = await prisma.user.findUnique({
        where: { userId },
        include: { payments: true }
    })

    return (
        <div className="p-10 font-mono space-y-4">
            <h1 className="text-xl font-bold">Darshni Debug (User ID: {userId})</h1>
            <p className="bg-gray-100 p-2 break-all">DATABASE_URL: {dbUrl}</p>
            <div className="space-y-2">
                <p>Physical Payment Count (Direct): <span className="font-bold text-blue-600">{pCount}</span></p>
                <p>Relationship Payment Count: <span className="font-bold text-blue-600">{user?.payments.length || 0}</span></p>
                {pFirst && <p>Found Payment ID: {pFirst.id}</p>}
                {!pFirst && <p className="text-red-500">NO PHYSICAL PAYMENT RECORD FOUND!</p>}
            </div>
            
            <pre className="mt-4 p-4 bg-gray-50 rounded border text-xs">
                {JSON.stringify(user, null, 2)}
            </pre>
        </div>
    )
}
