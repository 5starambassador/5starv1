import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('--- LEAD STATUS AUDIT ---')
  
  const statusCounts = await prisma.referralLead.groupBy({
    by: ['leadStatus'],
    where: { academicYear: '2026-2027' },
    _count: { leadId: true }
  })
  
  console.log('2026-2027 Statuses:', JSON.stringify(statusCounts, null, 2))
  
  const admittedInLedger = await prisma.referralLead.count({
    where: { academicYear: '2026-2027', leadStatus: 'Admitted' }
  })
  
  const confirmedInLedger = await prisma.referralLead.count({
    where: { academicYear: '2026-2027', leadStatus: 'Confirmed' }
  })
  
  console.log(`Leads in Ledger (Admitted Only): ${admittedInLedger}`)
  console.log(`Leads Missing from Ledger (Confirmed): ${confirmedInLedger}`)
  
  // Check if any Confirmed leads have a userId
  const confirmedWithUser = await prisma.referralLead.count({
    where: { academicYear: '2026-2027', leadStatus: 'Confirmed' }
  })

  
  console.log(`Confirmed Leads with User ID (Should be in Ledger): ${confirmedWithUser}`)
}

main()
