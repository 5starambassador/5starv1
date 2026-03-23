import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function debug() {
    const user = await prisma.user.findFirst({
        where: { mobileNumber: '9345450240' },
        include: {
            settlements: true,
            referrals: {
                include: {
                    settlements: true
                }
            }
        }
    })
    
    if (!user) {
        console.log("User not found.")
        return
    }

    console.log("=== USER ===")
    console.log("ID:", user.userId, "Name:", user.fullName)
    
    console.log("\n=== SETTLEMENTS AT USER LEVEL ===")
    user.settlements.forEach(s => {
        console.log(`ID: ${s.id} | Amount: ${s.amount} | Status: ${s.status} | Date: ${s.payoutDate} | Remarks: ${s.remarks} | Ref: ${s.bankReference}`)
    })

    console.log("\n=== REFERRALS & THEIR SETTLEMENTS ===")
    user.referrals.forEach(r => {
        console.log(`Referral: ${r.studentName || r.parentName} (Lead ID: ${r.leadId})`)
        r.settlements.forEach(s => {
             console.log(`  -> Sett ID: ${s.id} | Amount: ${s.amount} | Status: ${s.status} | Remarks: ${s.remarks}`)
        })
    })
}

debug().catch(console.error).finally(() => process.exit(0))
