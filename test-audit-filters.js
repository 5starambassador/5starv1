const { getAuditLogs } = require('./src/app/audit-actions')

async function test() {
    process.env.NODE_ENV = 'production'; // To simulate prod if needed, but not really

    console.log('--- Testing Audit Log Filters ---')

    // Test ADMIN filter
    console.log('Testing module: ADMIN...')
    const resAdmin = await getAuditLogs({ module: 'ADMIN' })
    if (resAdmin.success) {
        console.log(`Success! Found ${resAdmin.logs.length} logs for ADMIN.`)
        resAdmin.logs.slice(0, 3).forEach(l => {
            console.log(`- [${l.module}] ${l.action}`)
        })
    } else {
        console.log('Failed:', resAdmin.error)
    }

    // Test AUTH filter
    console.log('\nTesting module: AUTH...')
    const resAuth = await getAuditLogs({ module: 'AUTH' })
    if (resAuth.success) {
        console.log(`Success! Found ${resAuth.logs.length} logs for AUTH.`)
    }

    // Test LEADS filter
    console.log('\nTesting module: LEADS...')
    const resLeads = await getAuditLogs({ module: 'LEADS' })
    if (resLeads.success) {
        console.log(`Success! Found ${resLeads.logs.length} logs for LEADS.`)
    }
}

test()
