const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
    const withErp = await prisma.student.count({
        where: { fullName: { endsWith: "'s Child" }, admissionNumber: { not: null } }
    })
    const withoutErp = await prisma.student.count({
        where: { fullName: { endsWith: "'s Child" }, admissionNumber: null }
    })
    const withLead = await prisma.student.count({
        where: { fullName: { endsWith: "'s Child" }, referralLeadId: { not: null } }
    })
    const total = await prisma.student.count({
        where: { fullName: { endsWith: "'s Child" } }
    })
    console.log('Total fake-named          :', total)
    console.log('With ERP admissionNumber  :', withErp)
    console.log('Without ERP (no number)   :', withoutErp)
    console.log('Linked to referral lead   :', withLead)
    console.log('')
    if (withErp > 0) {
        console.log('*** These ' + withErp + ' have an ERP number - they are REAL students, only name is wrong')
        console.log('*** Strategy: UPDATE their name (re-import with correct name)')
    }
    if (withoutErp > 0) {
        console.log('*** These ' + withoutErp + ' have NO ERP number - likely bad/incomplete import data')
        console.log('*** Strategy: DELETE these records, then re-import properly')
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect())
