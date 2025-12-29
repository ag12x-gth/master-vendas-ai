const net = require('net');

// MOCK SERVICES
// Objetivo: Enganar os Agentes de Monitoramento para provar que eles reagem a portas abertas.
// Em produção, isso seriam os serviços reais.

const SERVICES = [
    { name: 'Mock Redis', port: 6379 },
    { name: 'Mock Postgres', port: 5432 }
];

SERVICES.forEach(service => {
    const server = net.createServer((socket) => {
        console.log(`[${service.name}] Client connected`);

        // Simplesmente aceita conexão e mantém viva por um tempo
        // Para o Redis/PG Monitor (TCP Probe), isso é suficiente para dar "Green"
        socket.write('OK');

        socket.on('error', (err) => {
            console.log(`[${service.name}] Connection error: ${err.message}`);
        });
    });

    server.listen(service.port, '127.0.0.1', () => {
        console.log(`[${service.name}] Listening on 127.0.0.1:${service.port}`);
    });

    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.log(`[${service.name}] Port ${service.port} already in use (Maybe real service is running?)`);
        } else {
            console.error(`[${service.name}] Error: ${e.message}`);
        }
    });
});

// Mantém processo vivo
setInterval(() => { }, 10000);
