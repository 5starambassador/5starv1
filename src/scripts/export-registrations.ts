import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function exportRegistrations() {
    console.log('📊 Exporting Registration Data...\n')

    try {
        // Fetch all users with their campus information
        const users = await prisma.user.findMany({
            include: {
                students: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        // Get campus names for reference
        const campuses = await prisma.campus.findMany()
        const campusMap = new Map(campuses.map(c => [c.id, c.campusName]))

        console.log(`Found ${users.length} registered users\n`)

        // Prepare CSV data
        const csvHeaders = [
            'Registration Date',
            'Full Name',
            'Mobile Number',
            'Email',
            'Role',
            'Referral Code',
            'Campus',
            'Child Name',
            'Grade',
            'Child EPR No',
            'Employee ID',
            'Payment Status',
            'Transaction ID',
            'Payment Amount',
            'Account Status',
            'Benefit Status'
        ].join(',')

        const csvRows = users.map(user => {
            const campusName = user.campusId ? campusMap.get(user.campusId) || 'N/A' : 'N/A'
            const registrationDate = new Date(user.createdAt).toLocaleDateString('en-IN')

            return [
                registrationDate,
                `"${user.fullName}"`,
                user.mobileNumber,
                user.email || 'N/A',
                user.role,
                user.referralCode || 'N/A',
                `"${campusName}"`,
                user.childName || 'N/A',
                user.grade || 'N/A',
                user.childEprNo || 'N/A',
                user.empId || 'N/A',
                user.paymentStatus,
                user.transactionId || 'N/A',
                user.paymentAmount,
                user.status,
                user.benefitStatus
            ].join(',')
        })

        const csvContent = [csvHeaders, ...csvRows].join('\n')

        // Save to file
        const exportDir = path.join(process.cwd(), 'exports')
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true })
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
        const filename = `registrations_${timestamp}.csv`
        const filepath = path.join(exportDir, filename)

        fs.writeFileSync(filepath, csvContent, 'utf-8')

        console.log('✅ Export Complete!\n')
        console.log(`📁 File saved to: ${filepath}`)
        console.log(`📊 Total records: ${users.length}`)
        console.log('\n--- Summary by Role ---')

        const roleCounts = users.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        Object.entries(roleCounts).forEach(([role, count]) => {
            console.log(`${role}: ${count}`)
        })

        console.log('\n--- Payment Status ---')
        const paymentCounts = users.reduce((acc, user) => {
            acc[user.paymentStatus] = (acc[user.paymentStatus] || 0) + 1
            return acc
        }, {} as Record<string, number>)

        Object.entries(paymentCounts).forEach(([status, count]) => {
            console.log(`${status}: ${count}`)
        })

    } catch (error) {
        console.error('❌ Export Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

exportRegistrations()
