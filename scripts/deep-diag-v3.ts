import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function auditCampaign34() {
    console.log('--- AUDITING CAMPAIGN 34 ---');
    
    const campaign = await prisma.campaign.findUnique({
        where: { id: 34 }
    });

    if (!campaign) {
        console.log('Campaign 34 not found!');
        return;
    }

    console.log('Campaign Name:', campaign.name);
    console.log('Audience Type:', (campaign as any).audienceType);
    console.log('Template Name:', (campaign as any).waTemplateName);
    console.log('Mapping:', JSON.stringify((campaign as any).waVariableMapping, null, 2));

    const templateName = (campaign as any).waTemplateName || 'summer_camp_followup_01';
    const waConfig = await prisma.whatsAppConfig.findFirst({
        where: { templateName: templateName }
    });

    if (waConfig) {
        console.log('WhatsApp Config Found:');
        console.log(' - Required Vars:', waConfig.requiredVariablesCount);
        console.log(' - Body template:', waConfig.templateBody);
    } else {
        console.log('WhatsApp Config NOT FOUND for template:', templateName);
    }

    console.log('\n--- VERIFYING ALIASTOKENS IMPORT ---');
    // We'll check if we can resolve a sample token with the current logic
    try {
        const { aliasTokens } = await import('../src/app/campaign-dispatcher');
        process.env.NEXT_PUBLIC_BASE_URL = 'https://www.5starambassador.com';
        
        const sampleUser = {
            fullName: 'Audit User',
            visitorName: 'Audit Visitor',
            studentName: 'Audit Student',
            referrerCode: 'AUDIT_REF',
            programSlug: 'wow-summer-camp'
        };

        const resolved = await aliasTokens('{Name}', sampleUser, 'PROGRAM_LEADS');
        console.log('TEST: Resolving {Name} for PROGRAM_LEADS:', resolved);
        
        const resolvedLink = await aliasTokens('{ProgramLink:wow-summer-camp}', sampleUser, 'PROGRAM_LEADS');
        console.log('TEST: Resolving {ProgramLink} for PROGRAM_LEADS:', resolvedLink);
        
    } catch (e: any) {
        console.error('Error during aliasTokens test:', e.message);
    }

    await prisma.$disconnect();
}

auditCampaign34();
