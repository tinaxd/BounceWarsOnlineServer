import net = require('net');

const server = net.createServer((conn) => {
    console.log('server listening on port 15243');

    conn.on('data', (data) => {
        console.log(data);
        conn.write('hello');
    });

    conn.on('close', () => {
        console.log('server closed');
    })
});
server.listen(15243);
