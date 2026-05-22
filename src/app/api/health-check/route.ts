import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  const result: any = {
    status: 'unhealthy',
    timestamp: new Date().toISOString(),
    database: {
      reachable: false,
      configured: false,
      hostname: null,
      error: null,
    },
    vercel: {
      region: process.env.VERCEL_REGION || null,
      environment: process.env.VERCEL_ENV || null,
    }
  }

  const dbUrl = process.env.DATABASE_URL
  if (dbUrl) {
    result.database.configured = true
    result.database.urlLength = dbUrl.length
    result.database.urlStartsWith = dbUrl.substring(0, 15)
    result.database.urlEndsWith = dbUrl.substring(Math.max(0, dbUrl.length - 15))
    result.database.hasQuotes = dbUrl.startsWith('"') || dbUrl.startsWith("'") || dbUrl.endsWith('"') || dbUrl.endsWith("'")
    result.database.charCodes = Array.from(dbUrl.substring(0, 10)).map(c => c.charCodeAt(0))
    try {
      // Parse hostname safely (masking credentials)
      const match = dbUrl.match(/@([^/:]+)/)
      if (match) {
        result.database.hostname = match[1]
      } else {
        result.database.hostname = 'Failed to parse hostname from URL'
      }
    } catch (e: any) {
      result.database.hostname = `Parse error: ${e.message}`
    }
  }

  try {
    // Perform a simple query to test connection
    await prisma.$queryRaw`SELECT 1`
    result.status = 'healthy'
    result.database.reachable = true
  } catch (error: any) {
    result.database.error = error.message || String(error)
    
    // Add specific recommendations for known issues
    if (result.database.error.includes('ep-patient-art-v393a12a-pooler')) {
      result.recommendation = 'Database Configuration Typo Detected in Vercel settings! Please update Vercel DATABASE_URL hostname from ep-patient-art-v393a12a-pooler to ep-patient-art-a1v3932a-pooler.'
    } else if (result.database.error.includes('P1001') || result.database.error.includes('Can\'t reach database server')) {
      result.recommendation = 'Prisma cannot connect to the database server. Check if the database host is correct, or if there is an IP Whitelist blocking connections from Vercel.'
    } else {
      result.recommendation = 'Please inspect the database credentials and configuration settings on Vercel.'
    }
  }

  return NextResponse.json(result)
}
