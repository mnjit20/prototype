const { parentPort, workerData } = require("worker_threads");

function heavyCalculation(limit) {
    let sum = 0;

    for (let i = 0; i < limit; i++) {
        sum += i;
    }

    return sum;
}

const result = heavyCalculation(workerData.limit);
// console.debug("🚀 ~ result:", result)
console.log(
    `Worker running with threadId=${require("worker_threads").threadId}`
);
parentPort.postMessage(result);
