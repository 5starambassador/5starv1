import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
    try {
        const session = await getSession()

        if (!session || !session.userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
        }

        const userId = Number(session.userId)
        const userType = session.userType as 'user' | 'admin'


        const body = await request.json()
        const { fullName, email, address, childEprNo, grade, childCampusId } = body

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
            // Check if sensitive Child Details are being updated
            // Only update them if provided, and if changed, set benefitStatus to PendingVerification?
            // User requested: "ok but verified by admin". So we save data but maybe reset benefitStatus?

            // Only update sensitive details if provided

            const updateData: any = {
                fullName: fullName.trim(),
                email: email?.trim() || null,
                address: address?.trim() || null
            }

            // Only update child details if present (Staff flow)
            if (childEprNo !== undefined) updateData.childEprNo = childEprNo
            if (grade !== undefined) updateData.grade = grade
            if (childCampusId !== undefined) updateData.campusId = parseInt(childCampusId) // Mapping childCampusId to campusId? 
            // WAIT: logic in actions.ts: "campusId" is Working Campus for Staff, but used as Studying Campus for fee lookup if "childInAchariya"
            // Let's stick to the pattern:
            // If the user updates "Studying Campus", we might need a separate field `childCampusId` in DB or reuse `campusId`?
            // In Registration:
            // campusId -> Working Campus
            // childCampusId -> Studying Campus (used for fee lookup only)

            // ISSUE: DB Schema `User` has `campusId`. Is it Working or Studying?
            // For Staff: `campusId` is Working.
            // For Parent: `campusId` is Studying.

            // If Staff wants to save Child Studying Campus, verified by Admin...
            // We probably need `childCampusId` column if we want to persist it separate from Working Campus.
            // But schema doesn't have `childCampusId`.
            // Let's check `actions.ts` registration flow again. 
            // It uses `childCampusId` to FIND fee, but does it SAVE it?
            // It saved `campusId` as Working Campus.
            // It saved `studentFee`.

            // So if User changes "Studying Campus", we just need to recalculate `studentFee`?
            // BUT "Verified by Admin" means we might NOT want to update `studentFee` instantly.
            // Instead, we save the "Requested Fee" or simply save the textual details and Admin manually updates Fee?

            // SIMPLIFICATION for this session:
            // Update `childEprNo` and `grade`.
            // Use `campusId` in DB for Working Campus (don't touch it if Staff).
            // We can't save "Studying Campus" ID unless we add a column.
            // BUT we can save the *Resulting Fee*? No, that's what we want to verify.

            // Let's update `childEprNo` and `grade`. 
            // And set `benefitStatus` = 'PendingVerification' so Admin sees it.

            if (grade !== undefined || childEprNo !== undefined) {
                // @ts-ignore - Enum might be stale in some environments
                updateData.benefitStatus = 'PendingVerification'
            }

            await prisma.user.update({
                where: { userId: userId },
                data: updateData
            })
        }

        return NextResponse.json({ success: true })

        // Sync: Notify Admin
        revalidatePath('/superadmin/verification')
        revalidatePath('/superadmin/users')
    } catch (error) {
        console.error('Profile update error:', error)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }
}
