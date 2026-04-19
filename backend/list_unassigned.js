const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/timetable.db');

db.all('SELECT subject_code, subject_name, faculty_id FROM Subjects WHERE faculty_id IS NULL', (err, rows) => {
    if (err) return console.error(err);
    console.log(`Unassigned Subjects (${rows.length}):`);
    rows.forEach(r => console.log(`${r.subject_code}: ${r.subject_name}`));
    db.close();
});
