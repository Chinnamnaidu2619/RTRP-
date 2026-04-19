const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/timetable.db');

db.run('UPDATE Subjects SET hours_per_week = 1 WHERE subject_name = "Environmental Science"', (err) => {
    if (err) {
        console.error('Update failed:', err);
        process.exit(1);
    } else {
        console.log('Successfully updated Environmental Science to 1 hour/week');
        db.close();
    }
});
