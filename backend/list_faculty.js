const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/timetable.db');

db.all('SELECT email, faculty_name FROM Faculty', (err, rows) => {
    if (err) return console.error(err);
    rows.forEach(r => console.log(`${r.email}: ${r.faculty_name}`));
    db.close();
});
