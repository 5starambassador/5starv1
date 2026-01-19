'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { logAction } from '@/lib/audit-logger'
import { revalidatePath } from 'next/cache'
import { transactionIdSchema } from '@/lib/validators'

/**
 * Fetches all settlement records with associated user details.
 */
export async function getSettlements() {
    try {
        const settlements = await prisma.settlement.findMany({
            include: {
                user: {
                    select: {
                        fullName: true,
                        mobileNumber: true,
                        role: true,
                        bankAccountDetails: true,
                        studentFee: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, settlements }
    } catch (error) {
        console.error('getSettlements error:', error)
        return { success: false, error: 'Failed to fetch settlements' }
    }
}

/**
 * Calculates current amount due to an ambassador.
 * Rule: (StudentFee * BenefitPercent / 100) * ConfirmedCount - TotalPreviouslySettled
 */
export async function calculatePendingSettlement(userId: number) {
    try {
        const user = await prisma.user.findUnique({
            where: { userId },
            select: {
                confirmedReferralCount: true,
                studentFee: true,
                settlements: {
                    select: { amount: true }
                }
            }
        })

        if (!user) return { success: false, error: 'User not found' }

        // Find applicable slab from BenefitSlab rules
        const slabs = await prisma.benefitSlab.findMany({
            orderBy: { referralCount: 'desc' }
        })

        const applicableSlab = slabs.find(s => user.confirmedReferralCount >= s.referralCount)
        const benefitPercent = applicableSlab ? applicableSlab.yearFeeBenefitPercent : 0

        const totalEarned = ((user.studentFee ?? 0) * (benefitPercent / 100)) * user.confirmedReferralCount
        const totalSettled = user.settlements.reduce((acc, s) => acc + s.amount, 0)

        const pending = Math.max(0, totalEarned - totalSettled)

        return { success: true, pending, totalEarned, totalSettled, benefitPercent }
    } catch (error) {
        console.error('calculatePendingSettlement error:', error)
        return { success: false, error: 'Calculation failed' }
    }
}

/**
 * Creates a new settlement entry in Pending status.
 * USES ATOMIC TRANSACTION: Verifies actual pending balance on server before creation.
 */
export async function createSettlement(userId: number, amount: number) {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') {
        return { success: false, error: 'Unauthorized' }
    }

    if (amount <= 0) {
        return { success: false, error: 'Invalid settlement amount' }
    }

    try {
        const result = await prisma.$transaction(async (tx) => {
            // 1. Fetch User data inside transaction
            const user = await tx.user.findUnique({
                where: { userId },
                select: {
                    confirmedReferralCount: true,
                    studentFee: true,
                    settlements: {
                        select: { amount: true }
                    }
                }
            })

            if (!user) throw new Error('User not found')

            // 2. Recalculate Benefit Slab inside transaction
            const slabs = await tx.benefitSlab.findMany({
                orderBy: { referralCount: 'desc' }
            })

            const applicableSlab = slabs.find(s => user.confirmedReferralCount >= s.referralCount)
            const benefitPercent = applicableSlab ? applicableSlab.yearFeeBenefitPercent : 0

            const totalEarned = ((user.studentFee ?? 0) * (benefitPercent / 100)) * user.confirmedReferralCount
            const totalSettled = user.settlements.reduce((acc, s) => acc + s.amount, 0)

            const actualPending = Math.max(0, totalEarned - totalSettled)

            // 3. Strict Verification: Is the requested amount valid?
            // Allow small rounding tolerance if needed, but strictly preventing overflow
            if (amount > actualPending + 0.01) {
                throw new Error(`Insufficient Balance: Available ₹${actualPending}, Requested ₹${amount}`)
            }

            // 4. Create Settlement
            const settlement = await tx.settlement.create({
                data: {
                    userId,
                    amount,
                    status: 'Pending'
                }
            })

            return settlement
        })

        await logAction('CREATE', 'settlement', `Created pending settlement for user ${userId}: ₹${amount}`, result.id.toString())
        revalidatePath('/superadmin')
        return { success: true, settlement: result }
    } catch (error: any) {
        console.error('createSettlement error:', error)
        return { success: false, error: error.message || 'Failed to create settlement' }
    }
}

/**
 * Completes a settlement by marking as Processed and adding bank reference details.
 */
export async function processSettlement(id: number, data: { bankReference: string, payoutDate?: Date, remarks?: string }) {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') {
        return { success: false, error: 'Unauthorized' }
    }

    if (!data.bankReference) {
        return { success: false, error: 'Bank reference / Transaction ID is required' }
    }

    const validation = transactionIdSchema.safeParse(data.bankReference)
    if (!validation.success) {
        return { success: false, error: validation.error.issues[0].message }
    }

    try {
        const settlement = await prisma.settlement.update({
            where: { id },
            data: {
                status: 'Processed',
                bankReference: data.bankReference,
                payoutDate: data.payoutDate || new Date(),
                remarks: data.remarks,
                processedBy: admin.userId
            }
        })

        await logAction('UPDATE', 'settlement', `Processed settlement ${id} (Ref: ${data.bankReference})`, id.toString())
        revalidatePath('/superadmin')
        return { success: true, settlement }
    } catch (error) {
        console.error('processSettlement error:', error)
        return { success: false, error: 'Failed to process settlement' }
    }
}

/**
 * Deletes a pending settlement record.
 */
export async function deleteSettlement(id: number) {
    const admin = await getCurrentUser()
    if (!admin || admin.role !== 'Super Admin') {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        await prisma.settlement.delete({ where: { id } })
        await logAction('DELETE', 'settlement', `Deleted settlement entry ${id}`, id.toString())
        revalidatePath('/superadmin')
        return { success: true }
    } catch (error) {
        console.error('deleteSettlement error:', error)
        return { success: false, error: 'Failed to delete' }
    }
}
