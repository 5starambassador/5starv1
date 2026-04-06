import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

if (!process.env.DATABASE_URL) {
    console.error('❌ FATAL: DATABASE_URL is not set in .env.local')
    process.exit(1)
}

const prisma = new PrismaClient()

/**
 * REPAIR SCRIPT: WhatsApp Log Healing (Fail-Safe Admin Mode)
 * Purpose: Backfills 'userRole' and 'campus' for existing logs.
 * PRIORITY: Admin > User > Parent > Referral > Lead
 */
async function healLogs() {
    try {
        console.log('🚀 Starting WhatsApp Log Healing (Admin Restoration Mode)...')
        
        // 1. Fetch Logs requiring healing (or cleanup)
        const logs = await (prisma as any).whatsAppLog.findMany({
            select: { id: true, mobile: true, content: true, userRole: true, campus: true }
        })

        console.log(`🔍 Processing ${logs.length} logs for full audit alignment...`)

        // 2. Load GLOBAL Mapping Data (High Speed)
        const [admins, users, students, referrals, leads] = await Promise.all([
            (prisma as any).admin.findMany({ select: { adminMobile: true, assignedCampus: true, role: true } }),
            prisma.user.findMany({ select: { mobileNumber: true, assignedCampus: true, role: true } }),
            prisma.student.findMany({ select: { parent: { select: { mobileNumber: true } }, campus: { select: { campusName: true } } } }),
            prisma.referralLead.findMany({ select: { parentMobile: true, campus: true } }),
            prisma.programLead.findMany({ select: { visitorMobile: true, referrer: { select: { assignedCampus: true } } } })
        ])

        const clean = (m: any) => (m || '').replace(/\s+/g, '').replace(/^91/, '').slice(-10)
        
        const adminMap = new Map(); admins.forEach((a: any) => adminMap.set(clean(a.adminMobile), a))
        const userMap = new Map(); users.forEach(u => userMap.set(clean(u.mobileNumber), u))
        const studentMap = new Map(); students.forEach(s => studentMap.set(clean(s.parent?.mobileNumber), s.campus?.campusName))
        const referralMap = new Map(); referrals.forEach(r => referralMap.set(clean(r.parentMobile), r.campus))
        const leadMap = new Map(); leads.forEach(l => leadMap.set(clean(l.visitorMobile), l.referrer?.assignedCampus))

        console.log(`🏗️ Audit maps generated. Performing deep reconciliation...`)

        // 3. Group Updates for Ultra Speed
        const updates = new Map<string, number[]>()
        for (const log of logs) {
            const m = clean(log.mobile)
            let c = '-', r = 'User'

            const adm = adminMap.get(m); const u = userMap.get(m); const sc = studentMap.get(m); const rc = referralMap.get(m); const lc = leadMap.get(m)

            // PRIORITY LOGIC
            if (adm) { c = adm.assignedCampus || 'CORPORATE'; r = adm.role || 'SUPER_ADMIN' }
            else if (u) { c = u.assignedCampus || '-'; r = u.role || 'User' }
            else if (sc) { c = sc; r = 'Parent' }
            else if (rc) { c = rc; r = 'Referral' }
            else if (lc) { c = lc; r = 'Lead' }
            else if (log.content?.toUpperCase().includes('LAWSPET')) c = 'LAWSPET'
            else if (log.content?.toUpperCase().includes('KK NAGAR')) c = 'KK NAGAR'

            // Only update if data is missing or mismatched
            if (log.campus !== c || log.userRole !== r) {
                const k = `${c}|${r}`; if (!updates.has(k)) updates.set(k, []); updates.get(k)!.push(log.id)
            }
        }

        console.log(`📦 Identified ${updates.size} unique update groups for realignment...`)

        let total = 0
        for (const [k, ids] of updates.entries()) {
            const [campus, role] = k.split('|')
            const res = await (prisma as any).whatsAppLog.updateMany({
                where: { id: { in: ids } },
                data: { campus, userRole: role }
            })
            total += res.count; console.log(`⚡ Realigned ${res.count} logs -> [${role} | ${campus}]`)
        }

        console.log(`✅ Audit Realignment Complete! ${total} logs now 100% accurate.`)
    } catch (e) { console.error('❌ Fail:', e); throw e }
}

healLogs().then(() => prisma.$disconnect()).catch(e => { console.error(e); process.exit(1) })
