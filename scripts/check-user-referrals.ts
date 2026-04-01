import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUsers() {
  const mobiles = ['9003094010', '9894877054', '9442339384'];
  
  console.log('\n--- Checking Leads and their Settlements ---');
  const leads = await prisma.referralLead.findMany({
    where: {
      parentMobile: { in: mobiles }
    },
    include: {
      user: true,
      settlements: true
    }
  });

  for (const lead of leads) {
    console.log(`Lead: ${lead.parentName} (${lead.parentMobile}) [${lead.leadStatus}] Year: ${lead.academicYear}`);
    console.log(`Referred by User ID: ${lead.userId} - ${lead.user.fullName} (${lead.user.mobileNumber})`);
    console.log(`Settlements for this lead: ${lead.settlements.length}`);
    lead.settlements.forEach(s => {
      console.log(`- Settlement ID: ${s.id}, Amount: ${s.amount}, Status: ${s.status}, Type: ${s.benefitType}`);
    });
    console.log('----------------------');
  }

  console.log('\n--- Checking Referrer Users for overall settlements ---');
  const referrerUserIds = [...new Set(leads.map(l => l.userId))];
  const referrers = await prisma.user.findMany({
    where: { userId: { in: referrerUserIds } },
    include: {
      settlements: true
    }
  });

  for (const ref of referrers) {
    console.log(`Referrer: ${ref.fullName} (${ref.mobileNumber})`);
    console.log(`Total Settlements: ${ref.settlements.length}`);
    const pending = ref.settlements.filter(s => s.status === 'Pending').length;
    const processed = ref.settlements.filter(s => s.status === 'Processed' || s.status === 'SUCCESS').length;
    console.log(`- Pending: ${pending}, Processed: ${processed}`);
    console.log('----------------------');
  }
}

checkUsers()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
