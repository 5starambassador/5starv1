import { PrismaClient } from '@prisma/client'
import { automationEngine } from './src/lib/automation-engine'

const prisma = new PrismaClient()

async function testAutomationEngine() {
    console.log('--- STARTING SMART REGEX ENGINE TEST ---')
    try {
        // Find how many rules are active
        const rules = await prisma.automationRule.findMany({
            where: { isActive: true }
        })
        
        console.log(`Found ${rules.length} active rules to test.`)
        
        // Execute the engine (Note: whatsapp dispatch inside is commented out for safety)
        const result = await automationEngine.runCronRules()
        
        console.log('\n--- TEST COMPLETE ---')
        console.log('Execution Results:', result)
    } catch (e) {
         console.error('Test Failed:', e)
    } finally {
        await prisma.$disconnect()
    }
}

testAutomationEngine()
