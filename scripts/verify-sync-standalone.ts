
import { PrismaClient } from '@prisma/client'
import fetch from 'node-fetch'

const prisma = new PrismaClient()

/**
 * Robust CSV parser that handles quoted fields correctly
 */
function parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    const lines = text.split(/\r?\n/);

    for (const line of lines) {
        if (!line.trim()) continue;

        const row: string[] = [];
        let inQuotes = false;
        let currentValue = '';

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                row.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        row.push(currentValue.trim());
        rows.push(row);
    }
    return rows;
}

// THE NEW LOGIC TO VERIFY
async function verifySync() {
    console.log('--- Verification Sync Starting ---')
    try {
        const programs = await prisma.externalProgram.findMany({
            where: { isActive: true, NOT: { autoSyncUrl: null } }
        })

        for (const program of programs) {
            console.log(`Checking program: ${program.title}`)
            if (!program.autoSyncUrl) continue;

            const response = await fetch(program.autoSyncUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            })
            let text = await response.text()

            if (text.includes('<html') || text.includes('DOCTYPE html')) {
                console.error(`Received HTML content instead of CSV for ${program.title}`)
                continue
            }

            if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);

            const rows = parseCSV(text)
            if (rows.length < 2) continue

            const normalize = (h: string) => h.trim().toLowerCase().replace(/[_\s-]/g, '')
            const headers = rows[0].map(h => normalize(h))

            const mobileIndex = headers.findIndex(h =>
                h === 'mobile' || h === 'phone' || h === 'contact' ||
                h.includes('mobile') || h.includes('phonenumber') || h.includes('contactnumber')
            )

            const nameIndex = headers.findIndex(h =>
                h === 'name' || h === 'student' || h === 'studentname' || h === 'fullname' ||
                h.includes('student') || h.includes('child') || h.includes('candidate') || (h.includes('name') && !h.includes('parent'))
            )

            const paymentStatusIndex = headers.findIndex(h =>
                h.includes('paymentstatus') || h.includes('orderstatus') || h.includes('status')
            )

            console.log(`Indices for ${program.title}:`, { mobileIndex, nameIndex, paymentStatusIndex })

            if (mobileIndex === -1 || paymentStatusIndex === -1) {
                console.error(`Missing columns for ${program.title}`)
                continue
            }

            const leadsToUpdate = rows.slice(1).map(row => {
                const rawMobile = row[mobileIndex]
                if (!rawMobile) return null
                const mobile = rawMobile.replace(/\D/g, '').slice(-10)
                if (mobile.length !== 10) return null

                let studentName = nameIndex !== -1 ? row[nameIndex]?.trim() : null
                let paymentStatus = paymentStatusIndex !== -1 ? row[paymentStatusIndex]?.trim().toUpperCase() : null

                return { mobile, studentName, paymentStatus }
            }).filter(l => l !== null)

            console.log(`Found ${leadsToUpdate.length} candidates in CSV.`)

            // Just check a few samples to see if they match existing leads
            const targetMobiles = leadsToUpdate.map(l => l!.mobile)
            const potentialLeads = await prisma.programLead.findMany({
                where: {
                    programId: program.id,
                    visitorMobile: { in: targetMobiles }
                }
            })

            console.log(`Matched ${potentialLeads.length} leads in DB.`)

            let registeredCount = 0
            leadsToUpdate.forEach(l => {
                const ps = (l!.paymentStatus || "").toUpperCase()
                if (['SUCCESS', 'PAID', 'CONFIRMED', 'COMPLETED', 'CAPTURED'].includes(ps)) {
                    registeredCount++
                }
            })
            console.log(`Leads that WOULD be marked as REGISTERED: ${registeredCount}`)
        }

    } catch (error) {
        console.error('Error during verification:', error)
    } finally {
        await prisma.$disconnect()
    }
}

verifySync()
