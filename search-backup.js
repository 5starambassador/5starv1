const fs = require('fs');

try {
    const data = fs.readFileSync('backup_data.json', 'utf8');
    const backup = JSON.parse(data);

    console.log('--- Searching backup_data.json ---');

    // Find Sangeetha in Users
    const sangeethas = backup.users.filter(u => u.fullName && u.fullName.toLowerCase().includes('sangeetha'));
    console.log(`Found ${sangeethas.length} users matching "Sangeetha":`);
    sangeethas.forEach(s => {
        console.log(`- ID: ${s.userId}, Name: ${s.fullName}, Referral Code: ${s.referralCode}, Count: ${s.confirmedReferralCount}`);
    });

    if (sangeethas.length > 0) {
        const ids = sangeethas.map(s => s.userId);
        const leads = backup.referralLeads.filter(l => ids.includes(l.userId));
        console.log(`\nFound ${leads.length} referral leads for these IDs:`);
        leads.forEach(l => {
            console.log(JSON.stringify(l, null, 2));
        });
    } else {
        console.log('\nNo users found matching "Sangeetha".');
    }

    console.log('\n--- Checking Referral Leads for Saravanan (found in CSV) ---');
    // From previous step, Saravanan ID was 1184 in DB. Let's see if he is in backup.
    const saravanan = backup.users.find(u => u.fullName && u.fullName.toLowerCase().includes('saravanan'));
    if (saravanan) {
        console.log(`Found Saravanan in backup: ID ${saravanan.userId}, Count: ${saravanan.confirmedReferralCount}`);
        const sLeads = backup.referralLeads.filter(l => l.userId === saravanan.userId);
        console.log(`Found ${sLeads.length} leads for Saravanan.`);
    }

} catch (e) {
    console.error('Error reading backup_data.json:', e.message);
}
