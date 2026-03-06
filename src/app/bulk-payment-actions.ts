'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { logAction } from '@/lib/audit-logger'
import { syncUserStats } from './sync-actions'
import { revalidatePath } from 'next/cache'
import { normalizeScientificNotation } from '@/lib/utils'

/**
 * Bulk Activate Users via CSV
 * Template: mobileNumber, transactionId, amount
 */
export async function bulkActivateUsers(csvData: string) {
    const admin = await getCurrentUser()
    const allowedRoles = ['Super Admin', 'Finance Admin']
    if (!admin || !allowedRoles.some(r => admin.role.includes(r))) {
        return { success: false, error: 'Unauthorized' }
    }

    try {
        const rows = parseCSV(csvData)
        if (rows.length === 0) return { success: false, error: 'No valid data found in CSV.' }

        let activatedCount = 0
        let alreadyActiveCount = 0
        let notFoundCount = 0
        const errors: string[] = []

        for (const row of rows) {
            const mobileNumber = normalizeScientificNotation(row.mobilenumber || row.mobileNumber || row['mobile number'])
            const transactionId = normalizeScientificNotation(row.transactionid || row.transactionId || row['utr'] || row['utr number'])
            const amount = parseFloat(row.amount || '25')

            if (!mobileNumber || !transactionId) {
                errors.push(`Missing Mobile or UTR in a row.`)
                continue
            }

            // Find User
            const user = await prisma.user.findUnique({
                where: { mobileNumber: mobileNumber.toString().trim() }
            })

            if (!user) {
                notFoundCount++
                errors.push(`Mobile ${mobileNumber} not found in database.`)
                continue
            }

            if (user.status === 'Active') {
                alreadyActiveCount++
                continue
            }

            // Process Activation
            await prisma.$transaction(async (tx) => {
                // 1. Check for existing payment by UTR (Avoid duplicates)
                const existingPayment = await tx.payment.findFirst({
                    where: { transactionId: transactionId.toString().trim() }
                })

                if (existingPayment) {
                    await tx.payment.update({
                        where: { id: existingPayment.id },
                        data: {
                            userId: user.userId,
                            orderStatus: 'SUCCESS',
                            paymentStatus: 'Success',
                            paidAt: new Date()
                        }
                    })
                } else {
                    await tx.payment.create({
                        data: {
                            orderId: `BULK_${Date.now()}_${user.userId}`,
                            transactionId: transactionId.toString().trim(),
                            userId: user.userId,
                            orderAmount: amount,
                            orderStatus: 'SUCCESS',
                            paymentStatus: 'Success',
                            paymentMethod: 'BULK_IMPORT',
                            paidAt: new Date()
                        }
                    })
                }

                // 2. Update User
                await tx.user.update({
                    where: { userId: user.userId },
                    data: {
                        status: 'Active',
                        paymentStatus: 'Success',
                        paymentAmount: amount,
                        transactionId: transactionId.toString().trim()
                    }
                })
            })

            // 3. Sync Benefits/Records
            await syncUserStats(user.userId)
            activatedCount++
        }

        await logAction('BULK_ACTIVATE', 'finance', `Bulk activation completed. Activated: ${activatedCount}, Not found: ${notFoundCount}, Already active: ${alreadyActiveCount}`, 'Superadmin')

        revalidatePath('/superadmin/approvals')
        revalidatePath('/superadmin/users')
        revalidatePath('/dashboard')

        return {
            success: true,
            summary: {
                activated: activatedCount,
                alreadyActive: alreadyActiveCount,
                notFound: notFoundCount,
                errors: errors.slice(0, 5)
            }
        }

    } catch (error: any) {
        console.error('Bulk Activation Error:', error)
        return { success: false, error: error.message }
    }
}

function parseCSV(csvText: string) {
    const cleanText = csvText.replace(/^\uFEFF/, '')
    const lines = cleanText.split(/\r?\n/).filter(line => line.trim() !== '')
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

    return lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
        const row: any = {}
        headers.forEach((h, i) => { row[h] = values[i] || '' })
        return row
    })
}
