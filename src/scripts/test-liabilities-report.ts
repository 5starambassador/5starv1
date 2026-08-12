import { getAccruedPayoutLiabilitiesInternal } from '../app/finance-actions'
import prisma from '../lib/prisma'

async function runDiagnostic() {
    console.log('--- Starting Liability Engine Diagnostic ---')
    
    // Mock the Super Admin object
    const mockAdmin = {
        userId: 9999,
        adminName: 'Diagnostic Admin',
        role: 'Super Admin',
        assignedCampus: null
    }

    try {
        console.log('Invoking getAccruedPayoutLiabilitiesInternal...')
        const start = Date.now()
        const res = await getAccruedPayoutLiabilitiesInternal(
            mockAdmin,
            'All',       // yearFilter
            undefined,   // search
            undefined,   // adminCampusId
            1,           // page
            50000        // pageSize (same as report-actions)
        )
        const duration = Date.now() - start
        
        console.log(`Query completed in ${duration}ms.`)
        if (res.success) {
            console.log(`SUCCESS: Fetched ${res.data?.length || 0} liability records successfully.`)
            
            // Try to flatten and run CSV generation
            console.log('Flattening referrals...')
            const enrichedReferrals = (res.data || []).flatMap((amb: any) => amb.referrals)
            console.log(`Found ${enrichedReferrals.length} confirmed/admitted referrals.`)
            
            // Import and run generateReferralStudentDetailsCSV
            const { generateReferralStudentDetailsCSV } = require('../lib/report-utils')
            console.log('Generating CSV...')
            const csv = generateReferralStudentDetailsCSV(enrichedReferrals)
            console.log(`SUCCESS: Generated CSV containing ${csv.split('\n').length} lines.`)
        } else {
            console.error('FAILURE returned from liabilities engine:', res.error)
        }
    } catch (error: any) {
        console.error('CRITICAL UNCAUGHT EXCEPTION in liabilities query:', error)
        if (error.stack) {
            console.error(error.stack)
        }
    } finally {
        await prisma.$disconnect()
        console.log('--- Diagnostic Finished ---')
    }
}

runDiagnostic()
