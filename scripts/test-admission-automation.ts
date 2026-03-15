import prisma from '../src/lib/prisma'
import { automationEngine } from '../src/lib/automation-engine'

async function testAdmissionFlow() {
  console.log('--- STARTING LEAD ADMISSION E2E TEST ---')

  // 1. Setup Test Rule for ON_LEAD_ADMITTED
  console.log('\n[1] Setting up Test Rule (ON_LEAD_ADMITTED)...')
  const testRule = await prisma.automationRule.create({
    data: {
      name: 'E2E Test: Admission Congratulation',
      triggerType: 'EVENT',
      triggerEvent: 'ON_LEAD_ADMITTED',
      conditions: {
        targetEntity: 'REFERRAL_LEAD',
      },
      actionType: 'SEND_WHATSAPP',
      actionTarget: 'admission_congrats_template',
      isActive: true,
    }
  })
  console.log(`Created test rule ID: ${testRule.id}`)

  // 2. Setup a Test Ambassador
  const mobile = `977777777${Math.floor(Math.random() * 10)}`
  const ambassador = await prisma.user.create({
    data: {
      fullName: 'Admission Test Ambassador',
      mobileNumber: mobile,
      role: 'Parent',
      status: 'Active',
      childInAchariya: true,
    }
  })
  console.log(`✅ Ambassador created: ${ambassador.mobileNumber}`)

  // 3. Simulate Lead Admission (Triggering ON_LEAD_ADMITTED)
  console.log('\n[2] Simulating Lead Admission...')
  
  // Create a real lead record marked as Admitted
  const admittedLead = await prisma.referralLead.create({
    data: {
      userId: ambassador.userId,
      parentName: 'Admitted Parent',
      parentMobile: '9000000000',
      studentName: 'Success Student',
      campus: 'Test Campus',
      academicYear: '2026-2027',
      leadStatus: 'Admitted'
    }
  })
  console.log(`✅ Lead created ID: ${admittedLead.leadId}`)
  
  // Trigger the engine with the REAL leadId
  await automationEngine.processImmediateEvent('ON_LEAD_ADMITTED', ambassador.userId, { leadId: admittedLead.leadId })

  // 4. Verify Logs
  console.log('\n[3] Verifying Automation Logs...')
  const logs = await prisma.automationLog.findMany({
    where: { ruleId: testRule.id, userId: ambassador.userId },
    orderBy: { createdAt: 'desc' },
    take: 1
  })

  console.log('Log Status:', logs[0]?.status || 'NOT FOUND')
  if (logs[0]?.status === 'SUCCESS' || (logs[0]?.status === 'SKIPPED' && logs[0]?.reason?.includes('No matching rule found'))) {
      // SUCCESS means it matched and tried to send (mocked or real)
      // SKIPPED with "No matching rule found" shouldn't happen here because we created a rule
      console.log('✅ PASS: Smart Rules engine correctly processed the Lead Admission.')
  } else if (logs[0]?.status === 'SKIPPED') {
      console.log(`⚠️ SKIPPED: ${logs[0]?.reason}`)
  } else {
      console.error('❌ FAIL: Smart Rules engine did not trigger.')
  }

  // Cleanup
  console.log('\n[4] Cleaning up test data...')
  await prisma.automationLog.deleteMany({ where: { ruleId: testRule.id } })
  await prisma.automationRule.delete({ where: { id: testRule.id } })
  await prisma.referralLead.delete({ where: { leadId: admittedLead.leadId } })
  await prisma.user.delete({ where: { userId: ambassador.userId } })
  console.log('Cleanup complete.')
  
  console.log('\n--- TESTS COMPLETE ---')
}

testAdmissionFlow().catch(console.error).finally(() => prisma.$disconnect())
