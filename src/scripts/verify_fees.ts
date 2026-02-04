
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    console.log('--- Checking Campuses ---');
    const campuses = await prisma.campus.findMany();
    console.log(campuses.map(c => ({ id: c.id, name: c.campusName })));

    console.log('\n--- Checking GradeFees for first few campuses ---');
    for (const campus of campuses.slice(0, 5)) {
        const fees = await prisma.gradeFee.findMany({
            where: { campusId: campus.id },
            take: 3
        });
        console.log(`Fees for ${campus.campusName}:`, fees.length > 0 ? fees.map(f => `${f.grade} (${f.academicYear}): OTP=${f.annualFee_otp}, WOTP=${f.annualFee_wotp}`) : 'None');
    }

    console.log('\n--- Testing getGradeFee Logic Simulation ---');
    // Simulate what getGradeFee does
    const testCampusName = "ASM"; // Guessing from screenshot potentially
    const testGrade = "Grade - 1"; // Guessing
    const academicYear = "2026-2027";

    const campus = await prisma.campus.findUnique({ where: { campusName: testCampusName } });
    if (!campus) {
        console.log(`Test Campus '${testCampusName}' NOT FOUND`);
    } else {
        console.log(`Test Campus '${testCampusName}' FOUND with ID ${campus.id}`);
        const fee = await prisma.gradeFee.findFirst({
            where: {
                campusId: campus.id,
                grade: testGrade,
                academicYear: academicYear
            }
        });
        console.log(`Fee for ${testGrade} / ${academicYear}:`, fee || 'NOT FOUND');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect()
    })
