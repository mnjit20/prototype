const cluster = require("cluster");
const os = require("os");
const express = require("express");

if (cluster.isPrimary) {
    const cpuCount = os.cpus().length;

    console.log(`Starting ${cpuCount} workers`);

    for (let i = 0; i < cpuCount; i++) {
        cluster.fork();
    }
} else {
    const app = express();

    app.get("/", (req, res) => {
        res.send(
            `Handled by PID ${process.pid}`
        );
    });

    app.listen(3000);
}