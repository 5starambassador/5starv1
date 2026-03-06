
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fields in Settlement model:');
    // @ts-ignore - inspecting fields
    const fields = (prisma as any)._dmmf.modelMap.Settlement.fields;
    fields.forEach((f: any) => console.log(`- ${f.name} (${f.type})`));
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
