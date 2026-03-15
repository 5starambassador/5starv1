import prisma from '@/lib/prisma'
import { whatsappService } from '@/lib/whatsapp-service'

/**
 * Expected JSON structure for rule conditions in the database.
 * The UI will generate these JSON blocks.
 */
export interface UserConditions {
  targetEntity?: string;
  role?: string[];
  status?: string[];
  benefitStatus?: string[];
  campus?: string[];
  daysSinceRegistration?: number;
  minReferrals?: number;
  maxReferrals?: number;
  missingBankDetails?: boolean;
  missingChildDetails?: boolean;
  registeredAfter?: string; // ISO Date String
  registeredBefore?: string; // ISO Date String
  paymentStatus?: string[];
  leadStatuses?: string[]; // For Referral Leads
  gradeInterested?: string[]; // For Referral Leads
  programLeadStatuses?: string[]; // For Program Leads
  daysSinceClick?: number; // For Program Leads
  leadFunnelStatus?: string; // hasPendingLeads | hasVisitedLeads | hasSubmittedNotConfirmed | hasNoLeads
  activityStatus?: string; // Active | Dormant (14-day check)
  isFiveStarOnly?: boolean;
  minAmount?: number;
  maxAmount?: number;
  ticketCategories?: string[];
  payoutCategories?: string[];
}

export class AutomationEngine {
  /**
   * Processes a real-time event trigger (e.g., PAYMENT_SUCCESS).
   * Finds matching rules and executes them for the specific user instantly.
   */
  async processImmediateEvent(triggerEvent: string, userId: number, metadata?: { leadId?: number; studentId?: number; amount?: number; category?: string; campus?: string }) {
    console.log(`[AutomationEngine] ⚡ Instant Event Trigger: ${triggerEvent} for User: ${userId}`)

    const rules = await prisma.automationRule.findMany({
      where: {
        isActive: true,
        triggerType: 'EVENT',
        triggerEvent: triggerEvent
      }
    })

    if (rules.length === 0) {
      console.log(`[AutomationEngine] No active rules found for event: ${triggerEvent}`)
      return
    }

    for (const rule of rules) {
      const conditions = (rule.conditions as any) as UserConditions || {}
      
      // Phase 10: Advanced Contextual Filters (Metadata checks)
      if (conditions.minAmount !== undefined && (metadata?.amount || 0) < conditions.minAmount) {
          await this.logExecution(rule.id, userId, triggerEvent, 'SKIPPED', `Amount ₹${metadata?.amount || 0} below min threshold ₹${conditions.minAmount}`, metadata);
          continue;
      }
      if (conditions.maxAmount !== undefined && (metadata?.amount || 0) > conditions.maxAmount) {
          await this.logExecution(rule.id, userId, triggerEvent, 'SKIPPED', `Amount ₹${metadata?.amount || 0} above max threshold ₹${conditions.maxAmount}`, metadata);
          continue;
      }
      if (conditions.ticketCategories?.length && metadata?.category && !conditions.ticketCategories.includes(metadata.category)) {
          await this.logExecution(rule.id, userId, triggerEvent, 'SKIPPED', `Ticket Category "${metadata.category}" not in allowed list`, metadata);
          continue;
      }
      if (conditions.payoutCategories?.length && metadata?.category && !conditions.payoutCategories.includes(metadata.category)) {
          await this.logExecution(rule.id, userId, triggerEvent, 'SKIPPED', `Payout Category "${metadata.category}" not in allowed list`, metadata);
          continue;
      }

      // Hardening: Frequency Capping (24h cooldown)
      const lastExecution = await prisma.automationLog.findFirst({
          where: { ruleId: rule.id, userId, status: 'SUCCESS', createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      });
      if (lastExecution) {
          await this.logExecution(rule.id, userId, triggerEvent, 'SKIPPED', 'Frequency cap hit (24h cooldown)', metadata);
          continue;
      }

      const targetEntity = conditions.targetEntity || 'USER'

      try {
        if (targetEntity === 'REFERRAL_LEAD' && metadata?.leadId) {
          const lQuery = this.buildLeadQuery(conditions)
          lQuery.leadId = metadata.leadId
          const lead = await prisma.referralLead.findFirst({ where: lQuery, include: { user: true } })
          if (lead?.user?.mobileNumber) {
            const templateKey = this.replaceVariables(rule.actionTarget || rule.triggerEvent || '', metadata)
            await whatsappService.sendByEvent(lead.user.mobileNumber, templateKey, [lead.user.fullName || 'Parent', lead.studentName || 'Student'], 'SYSTEM')
            await this.logExecution(rule.id, userId, triggerEvent, 'SUCCESS', 'Message dispatched to Referral parent', metadata);
          }
        } else if (targetEntity === 'PROGRAM_LEAD' && metadata?.leadId) {
          const pQuery = this.buildProgramLeadQuery(conditions)
          pQuery.id = metadata.leadId
          const pLead = await prisma.programLead.findFirst({ where: pQuery, include: { program: true } })
          if (pLead?.visitorMobile) {
            const templateKey = this.replaceVariables(rule.actionTarget || rule.triggerEvent || '', metadata)
            await whatsappService.sendByEvent(pLead.visitorMobile, templateKey, [pLead.visitorName || 'Visitor', pLead.program?.title || 'Program'], 'SYSTEM')
            await this.logExecution(rule.id, userId, triggerEvent, 'SUCCESS', 'Message dispatched to Program Lead', metadata);
          }
        } else if (targetEntity === 'STUDENT' && metadata?.studentId) {
          const sQuery = this.buildStudentQuery(conditions)
          sQuery.studentId = metadata.studentId
          const student = await prisma.student.findFirst({ where: sQuery, include: { parent: true } })
          if (student?.parent?.mobileNumber) {
            const templateKey = this.replaceVariables(rule.actionTarget || rule.triggerEvent || '', metadata)
            await whatsappService.sendByEvent(student.parent.mobileNumber, templateKey, [student.parent.fullName || 'Parent', student.fullName || 'Student'], 'SYSTEM')
            await this.logExecution(rule.id, userId, triggerEvent, 'SUCCESS', 'Message dispatched to Student parent', metadata);
          }
        } else {
          // Default: USER
          const uQuery = this.buildUserQuery(conditions)
          uQuery.userId = userId
          const user = await prisma.user.findFirst({ where: uQuery })
          if (user?.mobileNumber) {
            const templateKey = this.replaceVariables(rule.actionTarget || rule.triggerEvent || '', metadata)
            await whatsappService.sendByEvent(user.mobileNumber, templateKey, [user.fullName || 'Ambassador'], 'SYSTEM')
            await this.logExecution(rule.id, userId, triggerEvent, 'SUCCESS', 'Message dispatched to Ambassador', metadata);
          }
        }
      } catch (err: any) {
        await this.logExecution(rule.id, userId, triggerEvent, 'ERROR', err.message || 'Unknown error during execution', metadata);
        console.error(`[AutomationEngine] Failed to process rule ${rule.name}:`, err)
      }
    }
  }

  /**
   * Executes scheduled background rules (equivalent to the hardcoded reminder-service).
   */
  async runCronRules() {
    console.log('[AutomationEngine] Scanning for active CRON rules...')
    
    // 1. Fetch only ACTIVE scheduled rules
    const rules = await prisma.automationRule.findMany({
      where: {
        isActive: true,
        triggerType: 'CRON_DAILY'
      }
    })

    console.log(`[AutomationEngine] Found ${rules.length} active CRON daily rules.`)
    let totalProcessed = 0;

    for (const rule of rules) {
      console.log(`[AutomationEngine] Evaluating rule: ${rule.name} (Template: ${rule.triggerEvent})`)
      
      const conditions = (rule.conditions as any) as UserConditions || {}

      if (conditions.targetEntity === 'REFERRAL_LEAD') {
          const leads = await prisma.referralLead.findMany({ 
              where: this.buildLeadQuery(conditions), 
              include: { user: true }, 
              take: 100 
          })
          for (const lead of leads) {
              if (lead.user?.mobileNumber) {
                  const metadata = { leadId: lead.leadId }
                  const templateKey = this.replaceVariables(rule.actionTarget || rule.triggerEvent || '', metadata)
                  await whatsappService.sendByEvent(lead.user.mobileNumber, templateKey, [lead.user.fullName || 'Parent', lead.studentName || 'Student'], 'SYSTEM')
                  await this.logExecution(rule.id, lead.user.userId, 'CRON_DAILY', 'SUCCESS', 'Scheduled message to Referral parent', metadata);
                  totalProcessed++
              }
          }
      } else if (conditions.targetEntity === 'PROGRAM_LEAD') {
          const pLeads = await prisma.programLead.findMany({ 
              where: this.buildProgramLeadQuery(conditions), 
              include: { program: true, referrer: true }, 
              take: 100 
          })
          for (const p of pLeads) {
              if (p.visitorMobile) {
                  const metadata = { leadId: p.id }
                  const templateKey = this.replaceVariables(rule.actionTarget || rule.triggerEvent || '', metadata)
                  await whatsappService.sendByEvent(p.visitorMobile, templateKey, [p.visitorName || 'Visitor', p.program?.title || 'Program'], 'SYSTEM')
                  await this.logExecution(rule.id, p.referrerId, 'CRON_DAILY', 'SUCCESS', 'Scheduled message to Program Lead', metadata);
                  totalProcessed++
              }
          }
      } else if (conditions.targetEntity === 'STUDENT') {
          const students = await prisma.student.findMany({
              where: this.buildStudentQuery(conditions),
              include: { parent: true },
              take: 100
          })
          for (const s of students) {
              if (s.parent?.mobileNumber) {
                  const metadata = { studentId: s.studentId }
                  const templateKey = this.replaceVariables(rule.actionTarget || rule.triggerEvent || '', metadata)
                  await whatsappService.sendByEvent(s.parent.mobileNumber, templateKey, [s.parent.fullName || 'Parent', s.fullName || 'Student'], 'SYSTEM')
                  await this.logExecution(rule.id, s.parent.userId, 'CRON_DAILY', 'SUCCESS', 'Scheduled message to Student parent', metadata);
                  totalProcessed++
              }
          }
      } else {
          // Default: USER
          const targetUsers = await prisma.user.findMany({
            where: this.buildUserQuery(conditions),
            select: { userId: true, mobileNumber: true, fullName: true },
            take: 100
          })
          for (const user of targetUsers) {
              if (user.mobileNumber) {
                  // Frequency Cap (24h cooldown for CRON rules to prevent daily spam)
                  const lastRun = await prisma.automationLog.findFirst({
                      where: { 
                          ruleId: rule.id, 
                          userId: user.userId, 
                          status: 'SUCCESS', 
                          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } 
                      }
                  });
                  if (lastRun) continue;

                  const templateKey = this.replaceVariables(rule.actionTarget || rule.triggerEvent || '', {})
                  await whatsappService.sendByEvent(user.mobileNumber, templateKey, [user.fullName || 'Ambassador'], 'SYSTEM')
                  await this.logExecution(rule.id, user.userId, 'CRON_DAILY', 'SUCCESS', 'Scheduled message to Ambassador', {});
                  totalProcessed++
              }
          }
      }
    }

    return { processedRules: rules.length, totalActions: totalProcessed }
  }

  // --- Internal Query Builders (Parity with Campaign Engine) ---

  private buildUserQuery(conditions: UserConditions) {
      const query: any = {}
      if (conditions.role?.length) {
          // Map UI terminology to DB roles if necessary
          const roleMapping: Record<string, string> = {
              'Internal Staff': 'Staff',
              'Parent Network': 'Parent',
              'Alumni Circle': 'Alumni'
          }
          const mappedRoles = conditions.role.map(r => roleMapping[r] || r)
          query.role = { in: mappedRoles }
      }

      // --- Account Health Logic (Parity with Campaign Engine) ---
      if (conditions.status?.length) {
          const health = conditions.status[0]
          if (health === 'Active Only (Default)') {
              query.status = { in: ['Active', 'Pending'] }
              query.benefitStatus = 'Active'
          } else if (health === 'Inactive / Unverified') {
              query.OR = [
                  { status: 'Inactive' },
                  { benefitStatus: 'Inactive' }
              ]
          }
      }
      
      if (conditions.campus?.length) query.assignedCampus = { in: conditions.campus }
      if (conditions.paymentStatus?.length) query.paymentStatus = { in: conditions.paymentStatus }
      
      // --- Referral Milestone Logic (Exact Counts vs 5+) ---
      if (conditions.minReferrals !== undefined) {
          query.confirmedReferralCount = {}
          if (typeof conditions.minReferrals === 'number') {
              if (conditions.maxReferrals === conditions.minReferrals) {
                  // Exactly X
                  query.confirmedReferralCount = conditions.minReferrals
              } else {
                  // Min X
                  query.confirmedReferralCount.gte = conditions.minReferrals
                  if (typeof conditions.maxReferrals === 'number') {
                      query.confirmedReferralCount.lte = conditions.maxReferrals
                  }
              }
          }
      }

      if (conditions.leadFunnelStatus && conditions.leadFunnelStatus !== 'All') {
          query.AND = query.AND || []
          if (conditions.leadFunnelStatus === 'hasSubmittedNotConfirmed') {
              query.AND.push({ referrals: { some: {}, none: { leadStatus: { in: ['Confirmed', 'Admitted'] } } } })
          } else if (conditions.leadFunnelStatus === 'hasPendingLeads') {
              query.AND.push({ referrals: { some: { leadStatus: { in: ['New', 'Interested', 'Follow_up'] } } } })
          } else if (conditions.leadFunnelStatus === 'hasVisitedLeads') {
              // Now mapped to "Has Contacted Leads" in UI
              query.AND.push({ referrals: { some: { leadStatus: 'Contacted' } } })
          } else if (conditions.leadFunnelStatus === 'hasNoLeads') {
              query.AND.push({ referrals: { none: {} } })
          }
      }

      if (conditions.missingBankDetails) {
          query.AND = query.AND || []
          query.AND.push({ OR: [ { accountNumber: null }, { accountNumber: '' } ] })
      }
      if (conditions.missingChildDetails) {
          query.AND = query.AND || []
          query.AND.push({ role: 'Parent', students: { none: {} } })
      }

      if (conditions.daysSinceRegistration) {
          const pastDate = new Date(); pastDate.setDate(pastDate.getDate() - conditions.daysSinceRegistration);
          query.createdAt = { lt: pastDate }
      }

      if (conditions.isFiveStarOnly) {
          query.isFiveStarMember = true
      }

      // --- Activity Status Logic (Proxy using createdAt if updatedAt not available) ---
      if (conditions.activityStatus && conditions.activityStatus !== 'All') {
          const thresholdDate = new Date();
          thresholdDate.setDate(thresholdDate.getDate() - 14);
          if (conditions.activityStatus === 'Active') {
              query.createdAt = { gte: thresholdDate }
          } else if (conditions.activityStatus === 'Dormant') {
              query.createdAt = { lt: thresholdDate }
          }
      }

      return query
  }

  private buildLeadQuery(conditions: UserConditions) {
      const query: any = {}
      if (conditions.leadStatuses?.length) query.leadStatus = { in: conditions.leadStatuses }
      if (conditions.gradeInterested?.length) query.gradeInterested = { in: conditions.gradeInterested }
      if (conditions.campus?.length) query.campus = { in: conditions.campus }
      if (conditions.daysSinceRegistration) {
          const pDate = new Date(); pDate.setDate(pDate.getDate() - conditions.daysSinceRegistration);
          query.createdAt = { lt: pDate }
      }
      return query
  }

  private buildStudentQuery(conditions: UserConditions) {
      const query: any = { status: 'Active' }
      if (conditions.campus?.length) query.campus = { campusName: { in: conditions.campus } }
      // Add more specific student filters here if needed
      return query
  }

  private buildProgramLeadQuery(conditions: UserConditions) {
      const query: any = {}
      if (conditions.programLeadStatuses?.length) query.status = { in: conditions.programLeadStatuses }
      if (conditions.daysSinceClick) {
          const pDate = new Date(); pDate.setDate(pDate.getDate() - conditions.daysSinceClick);
          query.clickedAt = { lt: pDate }
      }
      return query
  }

  /**
   * Immediately tests a single rule by firing its payload to a test phone number.
   */
  async testRule(ruleId: number, testMobileNumber: string) {
      const rule = await prisma.automationRule.findUnique({ where: { id: ruleId } })
      if (!rule || !rule.triggerEvent) throw new Error("Rule or Template not found")

      let finalName = 'Testing Admin'
      const user = await prisma.user.findFirst({ where: { mobileNumber: testMobileNumber } })
      if (user?.fullName) finalName = user.fullName

      const templateKey = rule.actionTarget || rule.triggerEvent || ''
      await whatsappService.sendByEvent(testMobileNumber, templateKey, [finalName, 'Test Campus'], 'SYSTEM')
      return { success: true, message: `Test signal sent to MSG91 for ${testMobileNumber}.` }
  }

  // --- Helpers ---

  private async logExecution(ruleId: number, userId: number, event: string, status: string, reason?: string, metadata?: any) {
      try {
          await prisma.automationLog.create({
              data: { ruleId, userId, triggerEvent: event, status, reason, metadata: metadata || {} }
          })
      } catch (e) {
          console.error('[AutomationEngine] Failed to write log:', e)
      }
  }

  private replaceVariables(template: string, metadata?: any): string {
      if (!metadata) return template;
      let result = template;
      if (metadata.amount !== undefined) result = result.replace(/{{amount}}/g, String(metadata.amount));
      if (metadata.category) result = result.replace(/{{category}}/g, metadata.category);
      if (metadata.campus) result = result.replace(/{{campus}}/g, metadata.campus);
      return result;
  }
}

export const automationEngine = new AutomationEngine()
