import { whatsappService } from '../src/lib/whatsapp-service'
import prisma from '../src/lib/prisma'

async function verifyTrimming() {
  console.log('--- WHATSAPP BATCH TRIMMING VERIFICATION ---')
  
  // This template was verified to have requiredVariablesCount: 2
  const templateName = "program_registration_success" 
  
  // Simulating what CampaignDispatcher sends (5 variables)
  const testRecipients = [
    { 
      mobile: "8015000009", 
      variables: ["John Doe", "REF123", "Main Campus", "Grade 10", "Parent"] 
    }
  ]
  
  console.log(`🚀 Sending Batch for: ${templateName}`)
  console.log(`📝 Original Variables (5): ${JSON.stringify(testRecipients[0].variables)}`)

  try {
    // We use a fake refId to avoid actual successful dispatch blocking if it fails
    const result = await whatsappService.sendBulkTemplateMessage(
      testRecipients,
      templateName,
      'CAMPAIGN_TEST',
      'VERIFY-TRIM-001'
    )
    
    console.log('\n✅ Result:', result.success ? 'Success' : 'Failed (Expected if API key invalid)')
    if (!result.success) console.log('Error:', result.error)

  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

verifyTrimming()
