import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

// Configuration - Edit these to filter your export
const FILTERS = {
    // Date range (leave null to ignore)
    startDate: null as Date | null,  // Example: new Date('2026-01-01')
    endDate: null as Date | null,    // Example: new Date('2026-01-13')

    // Role filter (leave null to include all)
    role: null as string | null,     // Options: 'Parent', 'Staff', 'Alumni', 'Others'

    // Payment status filter (leave null to include all)
    paymentStatus: null as string | null,  // Options: 'Completed', 'Pending'

    // Campus filter (leave null to include all)
    campusId: null as number | null,  // Example: 1, 2, 3, etc.
}

async function exportFilteredRegistrations() {
    console.log('📊 Exporting Filtered Registration Data...\n')
    console.log('Applied Filters:')
    console.log(`  Date Range: ${FILTERS.startDate || 'Any'} to ${FILTERS.endDate || 'Any'}`)
    console.log(`  Role: ${FILTERS.role || 'All'}`)
    console.log(`  Payment Status: ${FILTERS.paymentStatus || 'All'}`)
    console.log(`  Campus ID: ${FILTERS.campusId || 'All'}`)
    console.log('')

    try {
        // Build dynamic where clause
        const whereClause: any = {}

        if (FILTERS.startDate || FILTERS.endDate) {
            whereClause.createdAt = {}
            if (FILTERS.startDate) whereClause.createdAt.gte = FILTERS.startDate
            if (FILTERS.endDate) whereClause.createdAt.lte = FILTERS.endDate
        }

        if (FILTERS.role) whereClause.role = FILTERS.role
        if (FILTERS.paymentStatus) whereClause.paymentStatus = FILTERS.paymentStatus
        if (FILTERS.campusId) whereClause.campusId = FILTERS.campusId

        // Fetch filtered users
        const users = await prisma.user.findMany({
            where: whereClause,
            include: {
                students: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })

        // Get campus names
        const campuses = await prisma.campus.findMany()
        const campusMap = new Map(campuses.map(c => [c.id, c.campusName]))

        console.log(`Found ${users.length} users matching filters\n`)

        if (users.length === 0) {
            console.log('⚠️  No users found with the specified filters.')
            return
        }

        // Prepare CSV
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
        const filterSuffix = [
            FILTERS.role && `role-${FILTERS.role}`,
            FILTERS.paymentStatus && `payment-${FILTERS.paymentStatus}`,
            FILTERS.campusId && `campus-${FILTERS.campusId}`
        ].filter(Boolean).join('_')

        const filename = `registrations_filtered_${filterSuffix ? filterSuffix + '_' : ''}${timestamp}.csv`
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

        console.log('\n--- By Campus ---')
        const campusCounts = users.reduce((acc, user) => {
            const campus = user.campusId ? campusMap.get(user.campusId) || 'Unknown' : 'Not Assigned'
            acc[campus] = (acc[campus] || 0) + 1
            return acc
        }, {} as Record<string, number>)
        Object.entries(campusCounts).forEach(([campus, count]) => {
            console.log(`${campus}: ${count}`)
        })

    } catch (error) {
        console.error('❌ Export Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

exportFilteredRegistrations()
