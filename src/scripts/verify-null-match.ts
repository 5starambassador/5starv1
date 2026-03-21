import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- Checking for ZIYA in Students ---')
    const ziyaStudents = await prisma.student.findMany({
        where: { fullName: { contains: 'ZIYA', mode: 'insensitive' } },
        select: { studentId: true, fullName: true, admissionNumber: true, campusId: true, parentId: true }
    })
    console.log('Ziya Students:', JSON.stringify(ziyaStudents, null, 2))

    console.log('\n--- Checking for Students with NULL Admission Number ---')
    const nullAdmissionStudents = await prisma.student.findMany({
        where: { admissionNumber: null },
        take: 5,
        select: { studentId: true, fullName: true, campusId: true }
    })
    console.log('Null Admission Students (first 5):', JSON.stringify(nullAdmissionStudents, null, 2))

    console.log('\n--- Checking a Sample Staff Member ---')
    const staff = await prisma.user.findFirst({
        where: { role: 'Staff' },
        select: { userId: true, fullName: true, childEprNo: true, childName: true, childCampusId: true }
    })
    console.log('Sample Staff:', JSON.stringify(staff, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
