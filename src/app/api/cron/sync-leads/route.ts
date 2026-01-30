import { syncProgramLeads } from '@/app/program-actions'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
    try {
        const authHeader = request.headers.get('authorization')
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const result = await syncProgramLeads()
        return NextResponse.json(result)
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 })
    }
}
