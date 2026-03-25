import { whatsappService } from '../src/lib/whatsapp-service'
import prisma from '../src/lib/prisma'

async function testDelivery() {
  console.log('--- WHATSAPP DELIVERY TEST ---')
  
  // 1. Define Test Data
  const testMobile = "8015000009" // User's provided test number
  const templateName = "welcome_message" // Verified as working in March 12th log
  
  const testVariables = ["Tester Name", "REF CODE 123"] 
  
  console.log(`🚀 Sending to: ${testMobile}`)
  console.log(`📝 Template: ${templateName}`)

  try {
    const result = await whatsappService.sendTemplateMessage(
      testMobile,
      templateName,
      testVariables,
      'TRANSACTIONAL',
      'TEST-REF-999'
    )
    
    console.log('\n✅ API Response:', JSON.stringify(result, null, 2))
    
    // 2. Verify Log Entry
    const log = await prisma.whatsAppLog.findFirst({
        where: { refId: 'TEST-REF-999' },
        orderBy: { createdAt: 'desc' }
    })
    
    if (log) {
        console.log(`\n📦 WhatsAppLog ID: ${log.id}`)
        console.log(`📊 Status: ${log.status}`)
        console.log(`🧹 Content in DB: ${log.content}`)
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

testDelivery()
