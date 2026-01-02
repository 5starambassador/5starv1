
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
    log: ['info']
})

const SLABS = { 1: 5, 2: 10, 3: 25, 4: 30, 5: 50 } as const

async function main() {
    console.log('Starting PRODUCTION seed...')

    // 1. Benefits Slabs (Upsert to preserve/update)
    console.log('Seeding Benefit Slabs...')
    const benefits = [
        { referralCount: 1, yearFeeBenefitPercent: 5, longTermExtraPercent: 5, baseLongTermPercent: 15 },
        { referralCount: 2, yearFeeBenefitPercent: 10, longTermExtraPercent: 10, baseLongTermPercent: 15 },
        { referralCount: 3, yearFeeBenefitPercent: 25, longTermExtraPercent: 15, baseLongTermPercent: 15 },
        { referralCount: 4, yearFeeBenefitPercent: 30, longTermExtraPercent: 20, baseLongTermPercent: 15 },
        { referralCount: 5, yearFeeBenefitPercent: 50, longTermExtraPercent: 25, baseLongTermPercent: 15 },
    ]

    for (const benefit of benefits) {
        await prisma.benefitSlab.upsert({
            where: { referralCount: benefit.referralCount },
            update: benefit,
            create: benefit,
        })
    }

    // 2. Admins (Upsert)
    console.log('Seeding Admins...')
    const admins = [
        { mobile: '9999999999', name: 'Super Admin', role: 'Super Admin' },
        { mobile: '8888888888', name: 'Campus Head', role: 'Campus Head' },
        { mobile: '7777777777', name: 'Admission Admin', role: 'Admission Admin' },
        { mobile: '6666666666', name: 'Finance Admin', role: 'Finance Admin' }
    ]

    for (const admin of admins) {
        await prisma.admin.upsert({
            where: { adminMobile: admin.mobile },
            update: {
                adminName: admin.name,
                role: admin.role
                // Don't update password if exists
            },
            create: {
                adminName: admin.name,
                adminMobile: admin.mobile,
                password: '123456', // Default PIN
                role: admin.role
            }
        })
    }

    // 3. Campuses (Safe Upsert)
    console.log('Seeding Campuses...')
    const CAMPUS_DATA = [
        { code: "VILL-912", name: "ASM-VILLIANUR(9-12)", location: "Villianur" },
        { code: "VILL-MONT", name: "ASM-VILLIANUR(MONT-8)", location: "Villianur" },
        { code: "VPM", name: "ASM-VILLUPURAM", location: "Villupuram" },
        { code: "ALPK", name: "ASM-ALAPAKKAM", location: "Alapakkam" },
        { code: "ADY", name: "ADYAR", location: "Adyar" }
    ]

    for (const c of CAMPUS_DATA) {
        // Safe Update Logic: Check Code OR Name
        const existing = await prisma.campus.findFirst({
            where: {
                OR: [
                    { campusCode: c.code },
                    { campusName: c.name }
                ]
            }
        })

        if (existing) {
            console.log(`Updating campus: ${c.name}`)
            await prisma.campus.update({
                where: { id: existing.id },
                data: {
                    campusName: c.name,
                    campusCode: c.code,
                    location: c.location,
                    grades: "K-12"
                }
            })
        } else {
            console.log(`Creating campus: ${c.name}`)
            await prisma.campus.create({
                data: {
                    campusName: c.name,
                    campusCode: c.code,
                    location: c.location,
                    grades: "K-12"
                }
            })
        }
    }

    // 4. Grade Fees
    console.log('Seeding Grade Fees...')
    const campuses = await prisma.campus.findMany()
    const GRADES = ['KG 1', 'KG 2', 'Grade 1', 'Grade 5', 'Grade 10', 'Grade 12']

    for (const campus of campuses) {
        for (const grade of GRADES) {
            let baseFee = 45000
            if (grade.includes('Grade')) baseFee = 65000
            if (grade.includes('10') || grade.includes('12')) baseFee = 85000

            await prisma.gradeFee.upsert({
                where: {
                    campusId_grade: {
                        campusId: campus.id,
                        grade: grade
                    }
                },
                update: {
                    annualFee: baseFee
                },
                create: {
                    campusId: campus.id,
                    grade: grade,
                    annualFee: baseFee
                }
            })
        }
    }

    console.log('PRODUCTION Seeding completed successfully. No mock data generated.')
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
