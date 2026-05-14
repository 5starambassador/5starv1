
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTemplate() {
    console.log("Checking template configuration for 'summer_camp_followup_01'...");
    const config = await prisma.whatsAppConfig.findFirst({
        where: { templateName: 'summer_camp_followup_01' }
    });
    
    if (config) {
        console.log("Database Config:", JSON.stringify(config, null, 2));
    } else {
        console.log("No config found in database.");
    }

    // Attempting a diagnostic send to see actual MSG91 structure requirement
    // (We will use a mock-like behavior to check the construction logic first)
    const variables = ["TestLead", "TestAmbassador", "https://example.com/link"];
    const buttonVariables = [];
    
    console.log("\nCurrent Construction (Body-Only):");
    console.log("Variables:", variables);
    console.log("Button Variables:", buttonVariables);
    console.log("This is likely what failed if MSG91 expects a button.");

    console.log("\nAlternative Construction (2 Body + 1 Button):");
    const altBody = variables.slice(0, 2);
    const altBtn = [variables[2]];
    console.log("Variables:", altBody);
    console.log("Button Variables:", altBtn);
}

checkTemplate().then(() => prisma.$disconnect());
