
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Normalizes grade names for consistent matching (e.g., Roman to Arabic).
 * This is the version from src/lib/utils.ts (standard)
 */
function normalizeGrade(grade: string | null | undefined): string {
    if (!grade) return ''

    let normalized = grade
        .toUpperCase()                    // Convert to uppercase
        .replace(/\s+/g, ' ')             // Normalize multiple spaces to single space
        .replace(/\s*-\s*/g, '-')         // Remove spaces around hyphens
        .trim()

    // Convert Roman numerals to Arabic numbers
    const romanMap: { [key: string]: string } = {
        'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5',
        'VI': '6', 'VII': '7', 'VIII': '8', 'IX': '9', 'X': '10',
        'XI': '11', 'XII': '12'
    }

    Object.keys(romanMap).forEach(roman => {
        const regex = new RegExp(`-${roman}$`, 'g')
        normalized = normalized.replace(regex, `-${romanMap[roman]}`)
        const spaceRegex = new RegExp(` ${roman}$`, 'g')
        normalized = normalized.replace(spaceRegex, `-${romanMap[roman]}`)
    })

    return normalized
}

async function runAudit() {
    console.log('🚀 Starting Fee Safety Audit...')
    
    // 1. Fetch all GradeFees for lookup
    const allGradeFees = await prisma.gradeFee.findMany()
    const gradeFeeMap = new Map<string, number>()
    
    allGradeFees.forEach(gf => {
        const key = `${gf.campusId}-${normalizeGrade(gf.grade)}-${gf.academicYear}`
        const fee = gf.annualFee_wotp || gf.annualFee_otp || 0
        if (fee > 0) {
            gradeFeeMap.set(key, fee)
        }
    })

    console.log(`📊 Loaded ${allGradeFees.length} grade fee rules.`)

    // 2. Fetch students with the 60,000 "Default" fee
    const ghostFeeStudents = await prisma.student.findMany({
        where: { baseFee: 60000 },
        include: { campus: true }
    })

    console.log(`🔍 Found ${ghostFeeStudents.length} students currently set to exactly ₹60,000.`)

    const potentialUpdates: any[] = []
    let cannotResolve = 0

    for (const student of ghostFeeStudents) {
        const normGrade = normalizeGrade(student.grade)
        const key = `${student.campusId}-${normGrade}-${student.academicYear}`
        const correctFee = gradeFeeMap.get(key)

        if (correctFee && correctFee !== 60000) {
            potentialUpdates.push({
                name: student.fullName,
                campus: student.campus.campusName,
                grade: student.grade,
                currentFee: student.baseFee,
                newFee: correctFee,
                academicYear: student.academicYear
            })
        } else if (!correctFee) {
            cannotResolve++
        }
    }

    console.log('\n--- AUDIT RESULTS ---')
    console.log(`✅ Students to be corrected: ${potentialUpdates.length}`)
    console.log(`⚠️  Students with 60,000 that could NOT be resolved: ${cannotResolve}`)
    console.log(`✨ Students already correct (Real fee is 60,000): ${ghostFeeStudents.length - potentialUpdates.length - cannotResolve}`)

    if (potentialUpdates.length > 0) {
        console.log('\n--- SAMPLE UPDATES (First 5) ---')
        console.table(potentialUpdates.slice(0, 5))
    }

    console.log('\nConclusion: Running the fix will update ' + potentialUpdates.length + ' records to match the specific GradeFee table.')
}

runAudit()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
