
import { PrismaClient } from '@prisma/client'
import { getRegistrationTransactions } from '../src/app/finance-actions'

const prisma = new PrismaClient()

async function main() {
    try {
        const year = "2026-2027"
        console.log(`--- Final Verification for ${year} ---`)

        // 1. Check a known user from the screenshot
        const lRes = await getRegistrationTransactions('All', year, 'Lochana')
        if (lRes.success && lRes.data) {
            console.log(`Lochana visible: Yes | Count: ${lRes.data.length}`)
            lRes.data.forEach((u: any) => console.log(`- User: ${u.fullName} | Role: ${u.role} | Year: ${u.academicYear}`))
        } else {
            console.log('Lochana visible: NO')
        }

        const kRes = await getRegistrationTransactions('All', year, 'Kavya')
        if (kRes.success && kRes.data) {
            console.log(`Kavya visible: Yes | Count: ${kRes.data.length}`)
            kRes.data.forEach((u: any) => console.log(`- User: ${u.fullName} | Role: ${u.role} | Year: ${u.academicYear}`))
        } else {
            console.log('Kavya visible: NO')
        }

    } catch (err) {
        console.error('Verification failed:', err)
    }
}

main().finally(() => prisma.$disconnect())
