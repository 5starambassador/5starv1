
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkProgramLeads() {
    try {
        console.log('--- Analyzing Program Leads ---');
        
        const totalLeads = await prisma.programLead.count();
        console.log(`Total Program Leads: ${totalLeads}`);
        
        const leads = await prisma.programLead.findMany({
            include: {
                referrer: {
                    select: {
                        fullName: true,
                        assignedCampus: true,
                        role: true
                    }
                }
            }
        });

        const campusStats = {};
        let unlinkedLeads = 0;
        let leadsWithNoReferrer = 0;

        leads.forEach(lead => {
            if (!lead.referrer) {
                leadsWithNoReferrer++;
                return;
            }
            
            const campus = lead.referrer.assignedCampus || 'Unassigned';
            campusStats[campus] = (campusStats[campus] || 0) + 1;
            
            if (!lead.referrer.assignedCampus) {
                unlinkedLeads++;
            }
        });

        console.log('\nLeads per Campus (via Referrer):');
        console.table(campusStats);
        
        console.log(`\nLeads with No Referrer: ${leadsWithNoReferrer}`);
        console.log(`Leads with Unassigned Campus (via Referrer): ${unlinkedLeads}`);

        if (leadsWithNoReferrer > 0) {
            console.log('\nSample Leads with No Referrer:');
            const sampleLeadsNoRef = leads.filter(l => !l.referrer).slice(0, 5);
            console.log(JSON.stringify(sampleLeadsNoRef, null, 2));
        }

        if (unlinkedLeads > 0) {
            console.log('\nSample Leads with Unassigned Campus:');
            const sampleUnlinked = leads.filter(l => l.referrer && !l.referrer.assignedCampus).slice(0, 5);
            console.log(JSON.stringify(sampleUnlinked, null, 2));
        }

    } catch (error) {
        console.error('Error during analysis:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkProgramLeads();
