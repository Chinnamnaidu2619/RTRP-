const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/timetable.db');

db.all("SELECT subject_code, subject_name, hours_per_week FROM Subjects WHERE subject_name LIKE '%Project%'", (err, rows) => {
    console.log(rows);
});
