import { PrismaClient } from '@prisma/client'

// Fallback for hosting platforms that don't support runtime env vars
const DATABASE_URL = process.env.DATABASE_URL ||
    'postgresql://neondb_owner:npg_yA8r7RhbwpMH@ep-calm-surf-a1lz48ro-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require'

const prismaClientSingleton = () => {
    return new PrismaClient({
        datasources: {
            db: {
                url: DATABASE_URL,
            },
        },
    })
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
