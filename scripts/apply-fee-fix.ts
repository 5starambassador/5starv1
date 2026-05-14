
import { PrismaClient } from '@prisma/client'
import { normalizeGrade } from '../src/lib/utils'

const prisma = new PrismaClient()

async function applyFix() {
    console.log('🚀 Starting Fee Data Correction...')
    
    // 1. Fetch all GradeFees for lookup
    const allGradeFees = await prisma.gradeFee.findMany()
    const gradeFeeMap = new Map<string, { otp: number; wotp: number }>()
    
    allGradeFees.forEach(gf => {
        const key = `${gf.campusId}-${normalizeGrade(gf.grade)}-${gf.academicYear}`
        gradeFeeMap.set(key, {
            otp: gf.annualFee_otp || 0,
            wotp: gf.annualFee_wotp || 0
        })
    })

    console.log(`📊 Loaded ${allGradeFees.length} grade fee rules.`)

    // 2. Fetch students with the 60,000 "Default" fee
    const ghostFeeStudents = await prisma.student.findMany({
        where: { baseFee: 60000 }
    })

    console.log(`🔍 Found ${ghostFeeStudents.length} students currently set to exactly ₹60,000.`)

    let updatedCount = 0
    let skippedCount = 0

    for (const student of ghostFeeStudents) {
        const normGrade = normalizeGrade(student.grade)
        const key = `${student.campusId}-${normGrade}-${student.academicYear}`
        const fees = gradeFeeMap.get(key)

        if (fees) {
            const plan = student.selectedFeeType === 'OTP' ? 'otp' : 'wotp'
            const correctFee = fees[plan] || fees.wotp // Fallback to WOTP if OTP is missing

            if (correctFee > 0 && correctFee !== 60000) {
                await prisma.student.update({
                    where: { studentId: student.studentId },
                    data: { baseFee: correctFee }
                })
                console.log(`✅ Updated ${student.fullName}: ₹60,000 -> ₹${correctFee.toLocaleString()} (${student.selectedFeeType || 'WOTP'})`)
                updatedCount++
            } else {
                skippedCount++
            }
        } else {
            console.log(`⚠️  Could not resolve fee for ${student.fullName} (Campus: ${student.campusId}, Grade: ${student.grade})`)
            skippedCount++
        }
    }

    console.log('\n--- FINAL REPORT ---')
    console.log(`✅ Total Records Corrected: ${updatedCount}`)
    console.log(`⚠️  Total Records Skipped: ${skippedCount}`)
    console.log('🚀 Correction complete.')
}

applyFix()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
