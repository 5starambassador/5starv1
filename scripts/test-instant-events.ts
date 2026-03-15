import { automationEngine } from '../src/lib/automation-engine'
import prisma from '../src/lib/prisma'

async function runTests() {
  console.log('--- STARTING E2E INSTANT EVENT TESTS ---')

  // 1. Setup a Test Rule for ON_USER_REGISTERED
  console.log('\n[1] Setting up Test Rule (ON_USER_REGISTERED)...')
  const testRule = await prisma.automationRule.create({
    data: {
      name: 'E2E Test: Welcome Message',
      triggerType: 'EVENT',
      triggerEvent: 'ON_USER_REGISTERED',
      conditions: {
        targetEntity: 'USER',
        isFiveStarOnly: true, // Only trigger for 5-star members
      },
      actionType: 'SEND_WHATSAPP',
      actionTarget: 'welcome_template_test',
      isActive: true,
    }
  })
  console.log(`Created test rule ID: ${testRule.id}`)

  // 2. Setup Test Users
  console.log('\n[2] Setting up Test Users...')
  
  // User A: Matches condition (isFiveStarOnly = true)
  const userA = await prisma.user.upsert({
    where: { mobileNumber: '9999999991' },
    update: { isFiveStarMember: true, fullName: 'Test Expert (Match)' },
    create: {
      mobileNumber: '9999999991',
      fullName: 'Test Expert (Match)',
      childInAchariya: false,
      role: 'Parent',
      isFiveStarMember: true,
    }
  })

  // User B: Does NOT match condition (isFiveStarOnly = false)
  const userB = await prisma.user.upsert({
    where: { mobileNumber: '9999999992' },
    update: { isFiveStarMember: false, fullName: 'Test Standard (No Match)' },
    create: {
      mobileNumber: '9999999992',
      fullName: 'Test Standard (No Match)',
      childInAchariya: false,
      role: 'Parent',
      isFiveStarMember: false,
    }
  })

  // 3. Trigger Events
  console.log('\n[3] Triggering ON_USER_REGISTERED events...')
  
  console.log('-> Triggering for User A (Should MATCH and log SUCCESS)')
  await automationEngine.processImmediateEvent('ON_USER_REGISTERED', userA.userId)
  
  console.log('\n-> Triggering for User B (Should SKIP and log SKIPPED)')
  await automationEngine.processImmediateEvent('ON_USER_REGISTERED', userB.userId)

  // 4. Verify Logs
  console.log('\n[4] Verifying Automation Logs...')
  const logsA = await prisma.automationLog.findMany({
    where: { ruleId: testRule.id, userId: userA.userId },
    orderBy: { createdAt: 'desc' },
    take: 1
  })
  
  const logsB = await prisma.automationLog.findMany({
    where: { ruleId: testRule.id, userId: userB.userId },
    orderBy: { createdAt: 'desc' },
    take: 1
  })

  console.log('Log for User A (Match Expected):', logsA[0]?.status || 'NOT FOUND')
  console.log('Log for User B (Skip Expected):', logsB[0]?.status || 'NOT FOUND') // Wait, the filter actually happens via query right now, so it might not even evaluate User B if the query filters them out. Let's check the engine.

  // Wait, processImmediateEvent fetches rules, then builds the query, then fires. Let's see if the user is found.
  // Actually, processImmediateEvent currently builds a query (e.g. buildUserQuery), adds the userId, and tries to find them. If not found, it does nothing. So it won't even log SKIPPED right now, it just won't find the user.
  // Let's verify this behavior.

  // Cleanup
  console.log('\n[5] Cleaning up test data...')
  await prisma.automationLog.deleteMany({ where: { ruleId: testRule.id } })
  await prisma.automationRule.delete({ where: { id: testRule.id } })
  console.log('Cleanup complete.')
  
  console.log('\n--- TESTS COMPLETE ---')
}

runTests().catch(console.error).finally(() => prisma.$disconnect())
