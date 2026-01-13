import { PrismaClient } from '@prisma/client'

// Source (Personal) Database
const sourceDb = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://neondb_owner:npg_yA8r7RhbwpMH@ep-calm-surf-a1lz48ro-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
        }
    }
})

// Target (Official Production) Database
const targetDb = new PrismaClient({
    datasources: {
        db: {
            url: 'postgresql://neondb_owner:npg_yLR5MHPuV9oA@ep-patient-art-a1v3932a-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
        }
    }
})

async function migrateData() {
    console.log('🚀 Starting Data Migration...\n')

    try {
        // 1. Migrate SystemSettings
        console.log('📋 Migrating SystemSettings...')
        const systemSettings = await sourceDb.systemSettings.findMany()
        for (const setting of systemSettings) {
            await targetDb.systemSettings.upsert({
                where: { id: setting.id },
                update: setting,
                create: setting
            })
        }
        console.log(`✓ Migrated ${systemSettings.length} SystemSettings\n`)

        // 2. Migrate AcademicYears
        console.log('📅 Migrating AcademicYears...')
        const academicYears = await sourceDb.academicYear.findMany()
        for (const year of academicYears) {
            await targetDb.academicYear.upsert({
                where: { id: year.id },
                update: year,
                create: year
            })
        }
        console.log(`✓ Migrated ${academicYears.length} AcademicYears\n`)

        // 3. Migrate SecuritySettings
        console.log('🔒 Migrating SecuritySettings...')
        const securitySettings = await sourceDb.securitySettings.findMany()
        for (const setting of securitySettings) {
            await targetDb.securitySettings.upsert({
                where: { id: setting.id },
                update: setting,
                create: setting
            })
        }
        console.log(`✓ Migrated ${securitySettings.length} SecuritySettings\n`)

        // 4. Migrate BenefitSlabs
        console.log('💰 Migrating BenefitSlabs...')
        const benefitSlabs = await sourceDb.benefitSlab.findMany()
        for (const slab of benefitSlabs) {
            await targetDb.benefitSlab.upsert({
                where: { slabId: slab.slabId },
                update: slab,
                create: slab
            })
        }
        console.log(`✓ Migrated ${benefitSlabs.length} BenefitSlabs\n`)

        // 5. Migrate Campuses
        console.log('🏫 Migrating Campuses...')
        const campuses = await sourceDb.campus.findMany()
        for (const campus of campuses) {
            await targetDb.campus.upsert({
                where: { id: campus.id },
                update: campus,
                create: campus
            })
        }
        console.log(`✓ Migrated ${campuses.length} Campuses\n`)

        // 6. Migrate GradeFees
        console.log('💵 Migrating GradeFees...')
        const gradeFees = await sourceDb.gradeFee.findMany()
        for (const fee of gradeFees) {
            await targetDb.gradeFee.upsert({
                where: { id: fee.id },
                update: fee,
                create: fee
            })
        }
        console.log(`✓ Migrated ${gradeFees.length} GradeFees\n`)

        // 7. Migrate Users
        console.log('👥 Migrating Users...')
        const users = await sourceDb.user.findMany()
        for (const user of users) {
            await targetDb.user.upsert({
                where: { userId: user.userId },
                update: user,
                create: user
            })
        }
        console.log(`✓ Migrated ${users.length} Users\n`)

        // 8. Migrate Admins
        console.log('👨‍💼 Migrating Admins...')
        const admins = await sourceDb.admin.findMany()
        for (const admin of admins) {
            await targetDb.admin.upsert({
                where: { adminId: admin.adminId },
                update: admin,
                create: admin
            })
        }
        console.log(`✓ Migrated ${admins.length} Admins\n`)

        // 9. Migrate ReferralLeads
        console.log('📞 Migrating ReferralLeads...')
        const referrals = await sourceDb.referralLead.findMany()
        for (const referral of referrals) {
            await targetDb.referralLead.upsert({
                where: { leadId: referral.leadId },
                update: referral,
                create: referral
            })
        }
        console.log(`✓ Migrated ${referrals.length} ReferralLeads\n`)

        // 10. Migrate Students
        console.log('🎓 Migrating Students...')
        const students = await sourceDb.student.findMany()
        for (const student of students) {
            await targetDb.student.upsert({
                where: { studentId: student.studentId },
                update: student,
                create: student
            })
        }
        console.log(`✓ Migrated ${students.length} Students\n`)

        console.log('✅ Migration Complete!\n')
        console.log('--- Final Counts ---')
        console.log(`Users: ${await targetDb.user.count()}`)
        console.log(`Admins: ${await targetDb.admin.count()}`)
        console.log(`Referrals: ${await targetDb.referralLead.count()}`)
        console.log(`Students: ${await targetDb.student.count()}`)
        console.log(`Campuses: ${await targetDb.campus.count()}`)

    } catch (error) {
        console.error('❌ Migration Error:', error)
    } finally {
        await sourceDb.$disconnect()
        await targetDb.$disconnect()
    }
}

migrateData()
