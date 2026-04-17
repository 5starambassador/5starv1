import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const campaign = await prisma.campaign.findUnique({
        where: { id: 34 }
    });
    
    if (!campaign) return;

    const mapping = (campaign as any).waVariableMapping || {}
    console.log('Raw Mapping:', JSON.stringify(mapping, null, 2));

    const mappingKeys = Object.keys(mapping).filter(k => {
        const cleanKey = k.replace('button_', 'var_')
        const stripped = cleanKey.replace(/\D/g, '')
        const num = Number(stripped)
        return !isNaN(num) && stripped !== ''
    })
    console.log('Mapping Keys:', JSON.stringify(mappingKeys));

    const maxVar = mappingKeys.length > 0 ? Math.max(...mappingKeys.map(k => Number(k.replace(/\D/g, '')))) : 5
    console.log('Max Var:', maxVar);

    for (let i = 1; i <= maxVar; i++) {
        const key = i.toString();
        console.log(`Key ${i}: ${mapping[key]}`);
    }

    await prisma.$disconnect();
}

main().catch(console.error);
