const express = require("express");
const app = express();

let currentMessage = null;
let waitingClients = [];

app.get("/messages", (req, res) => {
    console.log("API: messages");
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
