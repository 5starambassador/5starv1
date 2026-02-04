
import { PrismaClient } from '@prisma/client'
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const prisma = new PrismaClient()

async function main() {
    console.log('--- Checking GradeFees ---');
    
    // Check distinct academic years
    const years = await prisma.gradeFee.findMany({
        select: { academicYear: true },
        distinct: ['academicYear']
    });
    console.log('Available Academic Years:', years.map(y => y.academicYear));

    // Check specific campus fees (e.g. for a campus that exists)
    const someCampus = await prisma.campus.findFirst();
    if (someCampus) {
        console.log(`\nFees for Campus: ${someCampus.campusName} (ID: ${someCampus.id})`);
        const fees = await prisma.gradeFee.findMany({
            where: { campusId: someCampus.id, academicYear: '2026-2027' }
        });
        
        if (fees.length === 0) {
            console.log('No fees found for 2026-2027. Checking all years...');
            const allFees = await prisma.gradeFee.findMany({
                where: { campusId: someCampus.id },
                take: 10
            });
            console.log(allFees);
        } else {
            console.log(`Found ${fees.length} fee records for 2026-2027`);
            console.log(fees.slice(0, 5)); // Show first 5
        }
    } else {
        console.log("No campuses found.");
    }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
