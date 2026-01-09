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
        const { fullName, email, address } = await request.json()

        if (!fullName || fullName.trim().length < 2) {
            return NextResponse.json({ error: 'Full name must be at least 2 characters' }, { status: 400 })
        }

        // Update based on user type (the userId in session is mapped correctly to the primary key of each table)
        if (userType === 'admin') {
            await prisma.admin.update({
                where: { adminId: userId },
                data: {
                    adminName: fullName.trim(),
                    email: email?.trim() || null,
                    address: address?.trim() || null
                }
            })
        } else {
            await prisma.user.update({
                where: { userId: userId },
                data: {
                    fullName: fullName.trim(),
                    email: email?.trim() || null,
                    address: address?.trim() || null
                }
            })
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Profile update error:', error)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }
}
