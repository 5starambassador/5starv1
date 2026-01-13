
import { PrismaClient } from '../generated_client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

async function dumpData() {
    console.log('🔄 Starting Data Dump...')

    try {
        const data = {
            systemSettings: await prisma.systemSettings.findMany(),
            campuses: await prisma.campus.findMany(),
            admins: await prisma.admin.findMany(),
            users: await prisma.user.findMany(),
            students: await prisma.student.findMany(),
            referralLeads: await prisma.referralLead.findMany(),
            benefitSlabs: await prisma.benefitSlab.findMany(),
            resources: await prisma.resource.findMany(),
            marketingAssets: [], // Not in SQLite
            notifications: [], // Not in SQLite
            campaigns: [], // Not in SQLite
        }

        const outputPath = path.join(process.cwd(), 'backup_data.json')
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2))

        console.log(`✅ Data dumped successfully to ${outputPath}`)
        console.log('📊 Summary:')
        Object.entries(data).forEach(([key, val]) => {
            console.log(`   - ${key}: ${val.length} records`)
        })

    } catch (error) {
        console.error('❌ Dump failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

dumpData()
