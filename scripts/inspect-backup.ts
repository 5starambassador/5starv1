import fs from 'fs'
import path from 'path'

const BACKUP_FILE = '5star-backup-2026-01-21T00_34_13.252Z.json'

async function main() {
    console.log(`🔍 Inspecting backup: ${BACKUP_FILE}`)

    const filePath = path.resolve(process.cwd(), BACKUP_FILE)
    if (!fs.existsSync(filePath)) {
        console.error('File not found')
        return
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const backup = JSON.parse(content)

    const data = backup.data || {}

    console.log('--- Backup Contents ---')
    console.log(`Users: ${data.users?.length || 0}`)
    console.log(`Students: ${data.students?.length || 0}`)
    console.log(`ReferralLeads: ${data.leads?.length || 0}`) // Correct key 'leads'

    if (data.leads && data.leads.length > 0) {
        console.log('Sample Referral Date:', data.leads[0].createdAt)
        console.log('Last Referral Date:', data.leads[data.leads.length - 1].createdAt)
    }

    // Check available keys
    console.log('Keys in data:', Object.keys(data))
}

main()
