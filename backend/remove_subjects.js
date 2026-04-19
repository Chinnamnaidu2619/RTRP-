const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'timetable.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Clear Timetable first due to foreign key constraints
    db.run('DELETE FROM Timetable', (err) => {
        if (err) console.error('Error clearing Timetable:', err.message);
        else console.log('Timetable cleared.');
    });

    // Clear Subjects
    db.run('DELETE FROM Subjects', (err) => {
        if (err) console.error('Error clearing Subjects:', err.message);
        else console.log('Subjects cleared.');
    });

    db.run('COMMIT', (err) => {
        if (err) {
            console.error('Commit error:', err.message);
            db.run('ROLLBACK');
        } else {
            console.log('Transaction committed successfully.');
        }
        db.close();
    });
});
