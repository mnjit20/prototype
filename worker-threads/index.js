const { Worker } = require("worker_threads");

function runWorker(limit) {
    return new Promise((resolve, reject) => {
        const worker = new Worker("./worker.js", {
            workerData: { limit }
        });

        worker.on("message", resolve);

        worker.on("error", reject);

        worker.on("exit", code => {
            if (code !== 0) {
                reject(new Error(`Worker stopped: ${code}`));
            }
        });
    });
}

async function asyncMain() {
    console.time("workers");
    const results = await Promise.all([
        runWorker(1_000_000_000),
        runWorker(1_000_000_000),
        runWorker(1_000_000_000),
        runWorker(1_000_000_000),
        runWorker(1_000_000_000),

    ]);
    console.timeEnd("workers");
}


function heavyCalculation(limit) {
    let sum = 0;
    for (let i = 0; i < limit; i++) {
        sum += i;
    }

    return sum;
}

console.time("single");

heavyCalculation(1_000_000_000);
heavyCalculation(1_000_000_000);
heavyCalculation(1_000_000_000);
heavyCalculation(1_000_000_000);

console.timeEnd("single");

asyncMain();


