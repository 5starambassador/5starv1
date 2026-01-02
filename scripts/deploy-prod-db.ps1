
$env:DATABASE_URL = "postgresql://neondb_owner:npg_yLR5MHPuV9oA@ep-patient-art-a1v3932a-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

Write-Host "1. Pushing Schema to Neon Prod DB..."
npx prisma db push --schema=prisma/schema.prisma --accept-data-loss

Write-Host "2. Seeding Prod Data (Admins, Campuses)..."
npx tsx prisma/seed-production.ts

Write-Host "DEPLOYMENT COMPLETE"
