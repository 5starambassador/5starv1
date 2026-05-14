
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
    const c = await p.campaign.findUnique({ where: { id: 36 } });
    if (!c) {
        console.log("NOT_FOUND");
        return;
    }
    console.log("MAPPING_DATA_START");
    console.log(JSON.stringify(c.waVariableMapping, null, 2));
    console.log("MAPPING_DATA_END");
}
main().catch(console.error).finally(() => p.$disconnect());
