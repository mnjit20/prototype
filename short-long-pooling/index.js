const express = require("express");
const app = express();
const logger = require('pino')()
const pinoHttp = require('pino-http')()


let currentMessage = null;
let waitingClients = [];
// logger.info('hello world')
app.use(pinoHttp);
app.get("/messages", (req, res) => {
    console.log("API: messages");
    req.log.info('API: messages')
    if (currentMessage) {
        return res.json({
            message: currentMessage
        });
    }


    waitingClients.push(res);
});

app.post("/send", express.json(), (req, res) => {
    console.log("API: send");
    currentMessage = req.body.message;

    waitingClients.forEach(client => {
        client.json({
            message: currentMessage
        });
    });

    waitingClients = [];

    currentMessage = null;

    res.send("Delivered");
});

app.listen(3000);
