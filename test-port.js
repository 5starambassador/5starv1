
const net = require('net');

const host = '13.228.184.177';
const port = 5432;

console.log(`Connecting to ${host}:${port}...`);

const socket = new net.Socket();
socket.setTimeout(5000);

socket.on('connect', () => {
    console.log('SUCCESS: Port 5432 is reachable!');
    socket.destroy();
    process.exit(0);
});

socket.on('timeout', () => {
    console.log('FAILURE: Connection timed out (Port 5432 blocked?)');
    socket.destroy();
    process.exit(1);
});

socket.on('error', (err) => {
    console.log('FAILURE: ' + err.message);
    process.exit(1);
});

socket.connect(port, host);
