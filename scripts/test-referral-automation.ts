import prisma from '../src/lib/prisma'
import { automationEngine } from '../src/lib/automation-engine'

async function testReferralFlow() {
  console.log('--- STARTING REFERRAL SUBMISSION E2E TEST ---')

  // 1. Setup Test Rule for ON_LEAD_SUBMITTED
  console.log('\n[1] Setting up Test Rule (ON_LEAD_SUBMITTED)...')
  const testRule = await prisma.automationRule.create({
    data: {
      name: 'E2E Test: Referral Submission Follow-up',
      triggerType: 'EVENT',
      triggerEvent: 'ON_LEAD_SUBMITTED',
      conditions: {
        targetEntity: 'REFERRAL_LEAD',
      },
      actionType: 'SEND_WHATSAPP',
      actionTarget: 'referral_followup_template',
      isActive: true,
    }
  })
  console.log(`Created test rule ID: ${testRule.id}`)

  // 2. Setup a Test Ambassador
  const mobile = `988888888${Math.floor(Math.random() * 10)}`
  const ambassador = await prisma.user.create({
    data: {
      fullName: 'Test Ambassador',
      mobileNumber: mobile,
      role: 'Parent',
      status: 'Active',
      childInAchariya: true,
    }
  })
  console.log(`✅ Ambassador created: ${ambassador.mobileNumber}`)

  // 3. Simulate Lead Submission (Triggering ON_LEAD_SUBMITTED)
  console.log('\n[2] Simulating Lead Submission...')
  
  // Create a real lead record so the engine can find it
  const newLead = await prisma.referralLead.create({
    data: {
      userId: ambassador.userId,
      parentName: 'Referred Parent',
      parentMobile: '9111111111',
      studentName: 'Test Student',
      campus: 'Test Campus',
      academicYear: '2026-2027',
      leadStatus: 'New'
    }
  })
  console.log(`✅ Lead created ID: ${newLead.leadId}`)
  
  // Trigger the engine with the REAL leadId
  await automationEngine.processImmediateEvent('ON_LEAD_SUBMITTED', ambassador.userId, { leadId: newLead.leadId })

  // 4. Verify Logs
  console.log('\n[3] Verifying Automation Logs...')
  const logs = await prisma.automationLog.findMany({
    where: { ruleId: testRule.id, userId: ambassador.userId },
    orderBy: { createdAt: 'desc' },
    take: 1
  })

  console.log('Log Status:', logs[0]?.status || 'NOT FOUND')
  if (logs[0]?.status === 'SUCCESS') {
      console.log('✅ PASS: Smart Rules engine correctly detected the Referral Lead submission.')
  } else {
      console.error('❌ FAIL: Smart Rules engine did not trigger.')
  }

  // Cleanup
  console.log('\n[4] Cleaning up test data...')
  await prisma.automationLog.deleteMany({ where: { ruleId: testRule.id } })
  await prisma.automationRule.delete({ where: { id: testRule.id } })
  await prisma.user.delete({ where: { userId: ambassador.userId } })
  console.log('Cleanup complete.')
  
  console.log('\n--- TESTS COMPLETE ---')
}

testReferralFlow().catch(console.error).finally(() => prisma.$disconnect())
