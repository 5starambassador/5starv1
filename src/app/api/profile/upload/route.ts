import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
    try {
        const session = await getSession()

        if (!session || !session.userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const userId = Number(session.userId)
        const userType = session.userType as 'user' | 'admin'
        const { image } = await request.json()

        if (!image) {
            return NextResponse.json({ error: 'No image provided' }, { status: 400 })
        }

        // Update based on user type
        if (userType === 'admin') {
            await prisma.admin.update({
                where: { adminId: userId },
                data: { profileImage: image }
            })
        } else {
            await prisma.user.update({
                where: { userId: userId },
                data: { profileImage: image }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Profile photo upload error:', error)
        return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
    }
}
