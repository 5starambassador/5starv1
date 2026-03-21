import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany({
    where: { mobileNumber: '7402180557' },
    select: {
      userId: true,
      fullName: true,
      mobileNumber: true,
      role: true,
      assignedCampus: true,
      campusId: true,
      grade: true,
      studentFee: true,
      status: true,
      confirmedReferralCount: true,
      referralCode: true,
      createdAt: true,
      childInAchariya: true,
    }
  })

  const campuses = await prisma.campus.findMany({ select: { id: true, campusName: true } })
  const campusMap = new Map(campuses.map(c => [c.id, c.campusName]))

  const processedUsers = users.map(u => ({
    ...u,
    assignedCampus: campusMap.get(u.campusId || 0) || u.assignedCampus,
  }))

  console.log(JSON.stringify(processedUsers, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
