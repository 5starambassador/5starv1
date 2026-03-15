import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const mappings = [
  { key: 'ACTIVATE_ACCOUNT', name: 'activate_your_account' },
  { key: 'ADMIN_DAILY_DIGEST', name: 'admin_daily_digest' },
  { key: 'AMBASSADOR_PROGRAM_NUDGE', name: 'ambassador_program_nudge' },
  { key: 'AMBASSADOR_PROGRAM_SUCCESS', name: 'ambassador_program_success' },
  { key: 'BANK_DETAILS_REMINDER', name: 'bank_details_missing' },
  { key: 'CHILD_DETAILS_REMINDER', name: 'child_details_missing' },
  { key: 'FIVE_STAR_ACHIEVEMENT', name: 'five_star_achievement' },
  { key: 'KYC_APPROVED', name: 'kyc_approved' },
  { key: 'KYC_REJECTED', name: 'kyc_rejected' },
  { key: 'KYC_REMINDER', name: 'kyc_reminder' },
  { key: 'PAYMENT_REMINDER', name: 'payment_reminder' },
  { key: 'PENDING_ACCOUNT', name: 'pending_account_status' },
  { key: 'PENDING_STATUS', name: 'pending_account_status' },
  { key: 'PROGRAM_BROWSE_ABANDON', name: 'program_browse_abandon' },
  { key: 'PROGRAM_LAUNCH', name: 'program_launch_v1' },
  { key: 'PROGRAM_REGISTRATION_SUCCESS', name: 'program_registration_success' },
  { key: 'REFERRAL_CONFIRMED', name: 'referral_confirmed' },
  { key: 'REFERRAL_FOLLOWUP', name: 'referral_followup' },
  { key: 'REFERRAL_MOTIVATION', name: 'referral_motivation' },
  { key: 'REFERRAL_OTP', name: 'referral_otp' },
  { key: 'REFERRAL_REMINDER', name: 'nudge_for_active_users_with_0_referrals' },
  { key: 'REFERRAL_SUBMITTED_AMBASSADOR', name: 'referral_added_ambassdor' },
  { key: 'REFERRAL_SUBMITTED_PARENT', name: 'referral_message_to_referralparent' },
  { key: 'SETTLEMENT_PROCESSED', name: 'settlement_processed' },
  { key: 'TICKET_RESPONSE', name: 'ticket_response' },
  { key: 'WELCOME_DRIP_DAY1', name: 'welcome_drip_day1' },
  { key: 'WELCOME_DRIP_DAY3', name: 'welcome_drip_day3' },
  { key: 'WELCOME_MESSAGE', name: 'welcome_message' }
]

async function seed() {
  for (const map of mappings) {
    await prisma.whatsAppConfig.upsert({
      where: { eventKey: map.key },
      update: { templateName: map.name, isEnabled: true },
      create: { eventKey: map.key, templateName: map.name, isEnabled: true, requiredVariablesCount: 0 }
    })
    console.log(`Updated mapping for ${map.key} -> ${map.name}`)
  }
}

seed().catch(console.error).finally(() => prisma.$disconnect())
