import prisma from '../src/lib/prisma'
import { automationEngine } from '../src/lib/automation-engine'

/**
 * End-to-End Test: Payment Verification Flow -> Welcome Message
 * This script exactly mimics `src/app/api/payment/verify/route.ts` 
 * without actually calling the Cashfree API.
 */
async function testPaymentVerificationFlow() {
  console.log('--- STARTING PAYMENT VERIFICATION E2E ---')

  // 1. Setup Test Rule (ON_PAYMENT_SUCCESS for Rs 25+)
  console.log('\n[1] Setting up Test Rule for Welcome Message...')
  const testRule = await prisma.automationRule.create({
    data: {
      name: 'E2E Test: Dashboard Welcome Message',
      triggerType: 'EVENT',
      triggerEvent: 'ON_PAYMENT_SUCCESS',
      conditions: {
        targetEntity: 'USER',
        minAmount: 25, 
        isFiveStarOnly: false, // Standard User
      },
      actionType: 'SEND_WHATSAPP',
      actionTarget: 'welcome_template_dashboard',
      isActive: true,
    }
  })
  console.log(`✅ Rule created: ${testRule.name}`)

  // 2. Setup a Pending User and active Payment
  console.log('\n[2] Setting up Pending User and Payment...')
  const mobile = `999999998${Math.floor(Math.random() * 10)}`
  const mockUser = await prisma.user.create({
    data: {
      fullName: 'Pending User To Activate',
      mobileNumber: mobile,
      role: 'Parent',
      status: 'Pending', // User is pending until payment is verified
      paymentStatus: 'Pending',
      childInAchariya: false,
    }
  })
  
  const mockOrder = `order_test_${Date.now()}`
  const mockPayment = await prisma.payment.create({
    data: {
      userId: mockUser.userId,
      orderId: mockOrder,
      orderAmount: 25,
      orderStatus: 'ACTIVE', // Hasn't paid yet
      paymentStatus: 'Pending',
    }
  })
  console.log(`✅ User created (Status: Pending): ${mockUser.mobileNumber}`)
  console.log(`✅ Payment created (Status: Pending) Order: ${mockOrder}`)

  // 3. Simulate the Cashfree Webhook / Return URL execution
  console.log('\n[3] Simulating Cashfree Payment Success Return URL...')
  
  // Fake Cashfree Success Response
  const mockGatewayResponse = {
      payment_status: "SUCCESS",
      cf_payment_id: "cf_mock_" + Date.now(),
      payment_group: "upi",
      payment_amount: 25,
      bank_reference: "bank_ref_123"
  }

  // Exact logic from src/app/api/payment/verify/route.ts
  const successPayment = mockGatewayResponse.payment_status === "SUCCESS"
  const paymentStatusFormatted = successPayment ? "Success" : "Failed"

  console.log(`-> Updating Payment Record to 'Success'...`)
  const updatedPayment = await prisma.payment.update({
      where: { orderId: mockOrder },
      include: { user: true },
      data: {
          paymentStatus: paymentStatusFormatted,
          orderStatus: successPayment ? "PAID" : "ACTIVE",
          transactionId: mockGatewayResponse.cf_payment_id,
          paymentMethod: mockGatewayResponse.payment_group,
          bankReference: mockGatewayResponse.bank_reference,
          paidAt: new Date(),
          gatewayResponse: mockGatewayResponse as any
      }
  })

  // 4. Activate User & Trigger Smart Engine (Exactly like route.ts)
  if (successPayment && updatedPayment.userId) {
      console.log(`-> Updating User Record to 'Active'...`)
      
      const user = (updatedPayment as any).user;
      let referralCode = user?.referralCode;
      
      if (!referralCode) {
          const { generateSmartReferralCode } = await import('../src/lib/referral-service');
          referralCode = await generateSmartReferralCode(user.role);
      }

      await prisma.user.update({
          where: { userId: updatedPayment.userId },
          data: {
              status: 'Active',
              paymentStatus: 'Success',
              referralCode,
              transactionId: mockGatewayResponse.cf_payment_id,
              paymentAmount: mockGatewayResponse.payment_amount
          }
      })

      // Sync user stats (mocked)
      console.log(`-> Syncing User Stats...`)
      const { syncUserStats } = await import('../src/app/sync-actions');
      await syncUserStats(updatedPayment.userId)

      console.log(`-> Triggering ON_PAYMENT_SUCCESS Automation...`)
      await automationEngine.processImmediateEvent('ON_PAYMENT_SUCCESS', updatedPayment.userId, { 
          amount: mockGatewayResponse.payment_amount 
      })
  }

  // 5. Verify Engine Results
  console.log('\n[4] Verifying Automation Logs...')
  const logs = await prisma.automationLog.findMany({
    where: { ruleId: testRule.id, userId: mockUser.userId },
    orderBy: { createdAt: 'desc' },
    take: 1
  })

  console.log('Log Status:', logs[0]?.status || 'NOT FOUND')
  if (logs[0]?.status === 'SUCCESS') {
      console.log('✅ PASS: Welcome Message was instantly dispatched to the User upon payment verification.')
  } else {
      console.error('❌ FAIL: Message was not dispatched.')
  }

  // Check user status
  const finalUser = await prisma.user.findUnique({ where: { userId: mockUser.userId } })
  console.log(`End User Status: ${finalUser?.status}`)
  console.log(`End Referral Code: ${finalUser?.referralCode ? 'Generated' : 'Missing'}`)

  // Cleanup
  console.log('\n[5] Cleaning up test data...')
  await prisma.automationLog.deleteMany({ where: { ruleId: testRule.id } })
  await prisma.automationRule.delete({ where: { id: testRule.id } })
  await prisma.payment.delete({ where: { orderId: mockOrder } })
  await prisma.user.delete({ where: { userId: mockUser.userId } })
  console.log('Cleanup complete.')
  console.log('\n--- TESTS COMPLETE ---')
}

testPaymentVerificationFlow()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
