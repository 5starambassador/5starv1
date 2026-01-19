
const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

console.log('Testing connection...');
client.connect()
    .then(() => {
        console.log('SUCCESS!');
        process.exit(0);
    })
    .catch(err => {
        console.error('FAILURE:', err.message);
        process.exit(1);
    });
