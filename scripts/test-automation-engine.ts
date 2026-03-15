const { PrismaClient } = require('@prisma/client')
const { AutomationEngine } = require('../src/lib/automation-engine')

const prisma = new PrismaClient()
const engine = new AutomationEngine()

async function testEngineSafely() {
  console.log('=== STARTING 100% SAFE AUTOMATION ENGINE TEST ===\n')

  // 1. Create a temporary testing rule
  console.log('[Setup] Creating a temporary UI rule to target users registered > 30 days ago who are Parents...')
  const testRule = await prisma.automationRule.create({
    data: {
      name: 'Test Safe Rule (Auto-Delete)',
      triggerType: 'CRON_DAILY',
      triggerEvent: 'TEST_REMINDER_TEMPLATE',
      actionType: 'SEND_WHATSAPP',
      isActive: true, // Engine only reads active
      conditions: {
        role: ['Parent'],
        daysSinceRegistration: 30
      }
    }
  })

  try {
    // 2. Run the isolated Engine
    // (This will only print to console, actual send logic is commented out in engine)
    console.log('\n[Trigger] Booting up AutomationEngine...\n')
    const results = await engine.runCronRules()
    
    console.log('\n[Result] Engine Evaluation Complete!')
    console.log(`- Rules processed: ${results.processedRules}`)
    console.log(`- Potential Actions identified: ${results.totalActions}`)
    
  } finally {
    // 3. Clean up - leave zero trace
    console.log('\n[Cleanup] Removing temporary test rule to restore DB to exact original state...')
    await prisma.automationRule.delete({
      where: { id: testRule.id }
    })
    console.log('=== TEST COMPLETE - ZERO DATA LOST ===')
  }
}

testEngineSafely()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
