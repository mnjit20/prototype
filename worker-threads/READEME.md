# Worker Threads example
Worker thread example: ` npx tsx watch index.js`

## Cluster example

Worker thread example: ` npx tsx watch server.js`


Load testing
`npm install -g autocannon`

Run: 
`autocannon -c 100 -d 30 http://localhost:3000`

-c 100 = 100 concurrent connections
-d 30 = 30 seconds