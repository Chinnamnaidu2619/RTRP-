const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join('d:', 'timetable_system', 'backend', 'database', 'timetable.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
        process.exit(1);
    }
    console.log('Connected to database');
    
    const queries = [
        { name: 'Faculty', query: 'SELECT COUNT(*) as count FROM Faculty' },
        { name: 'Subjects', query: 'SELECT COUNT(*) as count FROM Subjects' },
        { name: 'Sections', query: 'SELECT COUNT(*) as count FROM Sections' },
        { name: 'Rooms', query: 'SELECT COUNT(*) as count FROM Rooms' }
    ];

    let completed = 0;
    queries.forEach(q => {
        db.get(q.query, (err, row) => {
            if (err) {
                console.error(`Error querying ${q.name}:`, err.message);
            } else {
                console.log(`${q.name}: ${row.count}`);
            }
            completed++;
            if (completed === queries.length) {
                db.close();
            }
        });
    });
});
