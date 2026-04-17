import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- Auditing Campus Fees for ABSM - ADYAR ---')
    
    // Find campus ID for ABSM - ADYAR
    const campus = await prisma.campus.findFirst({
        where: { campusName: { contains: 'ABSM - ADYAR', mode: 'insensitive' } }
    })
    
    if (!campus) {
        console.log('Campus ABSM - ADYAR not found')
        return
    }
    
    console.log(`Found Campus: ${campus.campusName} (ID: ${campus.id})`)
    
    // Fetch all grade fees for this campus
    const fees = await prisma.gradeFee.findMany({
        where: { campusId: campus.id }
    })
    
    if (fees.length === 0) {
        console.log('No fees found for this campus in Campus Master.')
    } else {
        console.log(`Found ${fees.length} grade fee entries:`)
        fees.forEach(f => {
            console.log(` - Grade: ${f.grade}, Fee (OTP): ${f.annualFee_otp}, Fee (WOTP): ${f.annualFee_wotp}, Year: ${f.academicYear}`)
        })
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
