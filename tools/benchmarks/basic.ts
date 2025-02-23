const autocannon = require('autocannon');

const runBasicBenchmark = async () => {
    const url = 'http://localhost:3030';
    const connections = 100;
    const duration = 20;

    const results = await autocannon({
        url,
        connections,
        duration,
    });

    autocannon.printResult(results);
};

runBasicBenchmark();
