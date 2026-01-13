import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('--- Seeding Official Production Database ---')

    try {
        // 1. Create System Settings
        console.log('Creating SystemSettings...')
        await prisma.systemSettings.upsert({
            where: { id: 1 },
            update: {},
            create: {
                allowNewRegistrations: true,
                defaultStudentFee: 60000,
                maintenanceMode: false
            }
        })
        console.log('✓ SystemSettings created')

        // 2. Create Academic Year
        console.log('Creating AcademicYear...')
        await prisma.academicYear.upsert({
            where: { year: '2025-2026' },
            update: {},
            create: {
                year: '2025-2026',
                startDate: new Date('2025-06-01'),
                endDate: new Date('2026-05-31'),
                isActive: true,
                isCurrent: true
            }
        })
        console.log('✓ AcademicYear created')

        // 3. Create Security Settings
        console.log('Creating SecuritySettings...')
        await prisma.securitySettings.upsert({
            where: { id: 1 },
            update: {},
            create: {
                sessionTimeoutMinutes: 30,
                maxLoginAttempts: 5,
                passwordResetExpiryHours: 24,
                twoFactorAuthEnabled: false
            }
        })
        console.log('✓ SecuritySettings created')

        // 4. Create Benefit Slabs
        console.log('Creating BenefitSlabs...')
        const slabs = [
            { referralCount: 1, yearFeeBenefitPercent: 5, longTermExtraPercent: 0 },
            { referralCount: 2, yearFeeBenefitPercent: 7, longTermExtraPercent: 0 },
            { referralCount: 3, yearFeeBenefitPercent: 10, longTermExtraPercent: 2 },
            { referralCount: 4, yearFeeBenefitPercent: 12, longTermExtraPercent: 3 },
            { referralCount: 5, yearFeeBenefitPercent: 15, longTermExtraPercent: 5 }
        ]

        for (const slab of slabs) {
            await prisma.benefitSlab.upsert({
                where: { referralCount: slab.referralCount },
                update: {},
                create: slab
            })
        }
        console.log('✓ BenefitSlabs created')

        console.log('\n--- Seeding Complete ---')
        console.log('✓ System is ready for new registrations!')

    } catch (error) {
        console.error('Error seeding database:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
