const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.whatsAppConfig.findMany({ orderBy: { eventKey: 'asc' } })
    .then(r => console.log(JSON.stringify(r.map(c => ({ eventKey: c.eventKey, templateName: c.templateName, isEnabled: c.isEnabled })), null, 2)))
    .catch(console.error)
    .finally(() => p.$disconnect());
