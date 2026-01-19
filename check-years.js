const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function checkAcademicYears() {
    try {
        const years = await prisma.academicYear.findMany();
        fs.writeFileSync('academic_years.json', JSON.stringify(years, null, 2));
    } catch (e) {
        fs.writeFileSync('academic_years.json', JSON.stringify({ error: e.message }, null, 2));
    } finally {
        await prisma.$disconnect();
    }
}

checkAcademicYears();
