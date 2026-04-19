const { generateTimetable } = require('./services/generator');
console.time('generation');
generateTimetable()
    .then(r => { console.timeEnd('generation'); console.log('SUCCESS:', r); process.exit(0); })
    .catch(e => { console.timeEnd('generation'); console.error('FAILED:', e.message); process.exit(1); });
