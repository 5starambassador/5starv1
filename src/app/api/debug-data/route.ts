import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  const users = await prisma.user.findMany({
    where: { OR: [
      { mobileNumber: '6374285445' },
      { mobileNumber: '+916374285445' }
    ]}
  })
  
  const students = await prisma.student.findMany({
    where: { parent: { mobileNumber: { in: ['6374285445', '+916374285445'] } } }
  })

  return NextResponse.json({ users, students })
}
