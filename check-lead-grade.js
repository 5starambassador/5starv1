
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkLead() {
    try {
        const lead = await prisma.referralLead.findFirst({
            where: {
                studentName: {
                    contains: 'Dhejasri',
                    mode: 'insensitive'
                }
            }
        })

        if (!lead) {
            console.log('Lead not found')
        } else {
            console.log('Lead found:', {
                id: lead.leadId,
                studentName: lead.studentName,
                grade: lead.gradeInterested,
                campus: lead.campus,
                feeType: lead.selectedFeeType,
                annualFee: lead.annualFee
            })
        }
    } catch (e) {
        console.error(e)
    } finally {
        await prisma.$disconnect()
    }
}

checkLead()
