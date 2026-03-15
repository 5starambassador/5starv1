import { automationEngine } from '../src/lib/automation-engine'
import prisma from '../src/lib/prisma'

async function runTests() {
  console.log('--- STARTING PAYMENT WELCOME E2E TEST ---')

  // 1. Setup a Test Rule for ON_PAYMENT_SUCCESS
  console.log('\n[1] Setting up Test Rule (ON_PAYMENT_SUCCESS for Rs 25+)...')
  const testRule = await prisma.automationRule.create({
    data: {
      name: 'E2E Test: Payment Welcome Message',
      triggerType: 'EVENT',
      triggerEvent: 'ON_PAYMENT_SUCCESS',
      conditions: {
        targetEntity: 'USER',
        minAmount: 25, // Specifically target payments of Rs. 25 or more
        // Removed isFiveStarOnly so it applies to standard users
      },
      actionType: 'SEND_WHATSAPP',
      actionTarget: 'welcome_template_payment',
      isActive: true,
    }
  })
  console.log(`Created test rule ID: ${testRule.id}`)

  // 2. Setup Test Users
  console.log('\n[2] Setting up Test Users...')
  
  // User C: Standard user who pays Rs. 25
  const userC = await prisma.user.upsert({
    where: { mobileNumber: '9999999993' },
    update: { isFiveStarMember: false, fullName: 'Standard User (Pays 25)' },
    create: {
      mobileNumber: '9999999993',
      fullName: 'Standard User (Pays 25)',
      childInAchariya: false,
      role: 'Parent',
      isFiveStarMember: false,
    }
  })

  // User D: Standard user who pays Rs. 10 (Should skip)
  const userD = await prisma.user.upsert({
    where: { mobileNumber: '9999999994' },
    update: { isFiveStarMember: false, fullName: 'Standard User (Pays 10)' },
    create: {
      mobileNumber: '9999999994',
      fullName: 'Standard User (Pays 10)',
      childInAchariya: false,
      role: 'Parent',
      isFiveStarMember: false,
    }
  })

  // 3. Trigger Events
  console.log('\n[3] Triggering ON_PAYMENT_SUCCESS events...')
  
  console.log('-> Triggering for User C (Metadata amount = 25) -> Should MATCH')
  await automationEngine.processImmediateEvent('ON_PAYMENT_SUCCESS', userC.userId, { amount: 25 })
  
  console.log('\n-> Triggering for User D (Metadata amount = 10) -> Should SKIP')
  await automationEngine.processImmediateEvent('ON_PAYMENT_SUCCESS', userD.userId, { amount: 10 })

  // 4. Verify Logs
  console.log('\n[4] Verifying Automation Logs...')
  const logsC = await prisma.automationLog.findMany({
    where: { ruleId: testRule.id, userId: userC.userId },
    orderBy: { createdAt: 'desc' },
    take: 1
  })
  
  const logsD = await prisma.automationLog.findMany({
    where: { ruleId: testRule.id, userId: userD.userId },
    orderBy: { createdAt: 'desc' },
    take: 1
  })

  console.log('Log for User C (Rs 25):', logsC[0]?.status || 'NOT FOUND')
  if (logsC[0]?.status === 'SUCCESS') {
      console.log('✅ User C successfully received the Welcome Message for Rs. 25 payment.')
  }

  console.log('Log for User D (Rs 10):', logsD[0]?.status || 'NOT FOUND')
  if (logsD.length > 0 && logsD[0].status === 'SKIPPED') {
      console.log(`✅ User D was exactly correctly skipped. Reason: ${logsD[0].reason}`)
  }

  // Cleanup
  console.log('\n[5] Cleaning up test data...')
  await prisma.automationLog.deleteMany({ where: { ruleId: testRule.id } })
  await prisma.automationRule.delete({ where: { id: testRule.id } })
  console.log('Cleanup complete.')
  
  console.log('\n--- TESTS COMPLETE ---')
}

runTests().catch(console.error).finally(() => prisma.$disconnect())
