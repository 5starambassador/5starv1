import { Client } from 'pg'

const url1 = "postgresql://neondb_owner:npg_yLR5MHPuV9oA@ep-patient-art-a1v3932a-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
const url2 = "postgresql://neondb_owner:npg_yLR5MHPuV9oA@ep-patient-art-v393a12a-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"

async function testConnection(url: string, name: string) {
    console.log(`Testing ${name}...`)
    const client = new Client({ connectionString: url })
    try {
        await client.connect()
        console.log(`${name} SUCCESSFUL`)
        await client.end()
    } catch (err: any) {
        console.error(`${name} FAILED:`, err.message)
    }
}

async function run() {
    await testConnection(url1, ".env URL")
    await testConnection(url2, "Screenshot URL")
}

run()
