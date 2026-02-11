import prisma from '@/lib/prisma'

/**
 * Backfill Script: Populate annualFee and selectedFeeType for existing students
 * 
 * This script calculates the annual fee for all students who are missing this data
 * by looking up their grade and campus in the GradeFee table.
 */
async function backfillStudentFees() {
    console.log('[BACKFILL] Starting student fee backfill...')

    try {
        // Fetch all students missing annualFee or selectedFeeType
        const studentsToUpdate = await prisma.student.findMany({
            where: {
                OR: [
                    { annualFee: null },
                    { selectedFeeType: null }
                ]
            },
            include: {
                campus: true
            }
        })

        console.log(`[BACKFILL] Found ${studentsToUpdate.length} students needing fee backfill`)

        let updated = 0
        let failed = 0

        for (const student of studentsToUpdate) {
            try {
                // Get current academic year
                const currentYearRecord = await prisma.academicYear.findFirst({
                    where: { isCurrent: true }
                })
                const currentYear = currentYearRecord?.year || student.academicYear || "2025-2026"

                // Look up grade fee
                const gradeFee = await prisma.gradeFee.findFirst({
                    where: {
                        campusId: student.campusId,
                        grade: student.grade,
                        academicYear: currentYear
                    }
                })

                if (!gradeFee) {
                    console.warn(`[BACKFILL] No GradeFee found for student ${student.studentId} (Grade: ${student.grade}, Campus: ${student.campus?.campusName})`)
                    failed++
                    continue
                }

                // Default to WOTP if not specified
                const feeType = student.selectedFeeType || 'WOTP'
                const annualFee = feeType === 'OTP'
                    ? (gradeFee.annualFee_otp || student.baseFee || 60000)
                    : (gradeFee.annualFee_wotp || student.baseFee || 60000)

                // Update student record
                await prisma.student.update({
                    where: { studentId: student.studentId },
                    data: {
                        selectedFeeType: feeType,
                        annualFee: annualFee
                    }
                })

                updated++

                if (updated % 100 === 0) {
                    console.log(`[BACKFILL] Progress: ${updated}/${studentsToUpdate.length}`)
                }
            } catch (err: any) {
                console.error(`[BACKFILL] Error updating student ${student.studentId}:`, err.message)
                failed++
            }
        }

        console.log(`[BACKFILL] ✅ Complete! Updated: ${updated}, Failed: ${failed}`)
        return { success: true, updated, failed }
    } catch (error: any) {
        console.error('[BACKFILL] Fatal error:', error)
        return { success: false, error: error.message }
    }
}

// Execute immediately if run directly
if (require.main === module) {
    backfillStudentFees()
        .then((result) => {
            console.log('[BACKFILL] Final result:', result)
            process.exit(0)
        })
        .catch((error) => {
            console.error('[BACKFILL] Fatal error:', error)
            process.exit(1)
        })
}

export { backfillStudentFees }
