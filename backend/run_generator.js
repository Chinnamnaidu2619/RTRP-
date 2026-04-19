const generatorService = require('./services/generator');

async function run() {
    try {
        console.log('Starting timetable generation for 21 sections...');
        const result = await generatorService.generateTimetable();
        console.log('Success!', result);
        process.exit(0);
    } catch (error) {
        console.error('Generation failed:', error.message);
        process.exit(1);
    }
}

run();
