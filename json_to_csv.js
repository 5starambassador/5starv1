const fs = require('fs');
const data = JSON.parse(fs.readFileSync('ghost_users.json', 'utf8'));
const headers = ['userId', 'fullName', 'mobileNumber', 'childName', 'childEprNo', 'grade', 'assignedCampus'];

const csvRows = [];
// Add header row
csvRows.push(headers.join(','));

// Add data rows
for (const row of data) {
    const values = headers.map(header => {
        const val = row[header] === null || row[header] === undefined ? '' : String(row[header]);
        const escaped = val.replace(/"/g, '""');
        return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
}

fs.writeFileSync('pending_verification_ghost_users.csv', csvRows.join('\n'));
console.log('CSV created: pending_verification_ghost_users.csv');
