const generator = require('./services/generator');
const db = require('./db');

console.log('Starting standalone generation test...');

generator.generateTimetable()
    .then(result => {
        console.log('Generation Success:', result);
        process.exit(0);
    })
    .catch(error => {
        console.error('Generation Failed:');
        console.error(error);
        process.exit(1);
    });
