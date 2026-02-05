const { Client } = require('pg');

async function main() {
    const config = {
        connectionString: "postgresql://neondb_owner:npg_yLR5MHPuV9oA@ep-patient-art-a1v3932a.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
        ssl: {
            rejectUnauthorized: false
        },
        connectionTimeoutMillis: 30000,
    };

    const client = new Client(config);

    try {
        console.log("Connecting with pg...");
        await client.connect();
        console.log("Connected successfully!");
        const res = await client.query('SELECT count(*) FROM "User"'); // Assuming table name is User based on Prisma schema
        console.log("Count result:", res.rows[0].count);
    } catch (err) {
        console.error("Connection error:", err.stack);
    } finally {
        await client.end();
    }
}

main();
