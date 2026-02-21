import { getCampuses } from '../../campus-actions'
import { NextResponse } from 'next/server'

export async function GET() {
    console.log('[DEBUG API] Calling getCampuses()...')
    const result = await getCampuses()
    return NextResponse.json(result)
}
