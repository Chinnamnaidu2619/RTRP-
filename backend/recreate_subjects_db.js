const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/timetable.db');

db.serialize(() => {
    db.run('DROP TABLE IF EXISTS Subjects');
    
    db.run(`
        CREATE TABLE Subjects (
            subject_code TEXT NOT NULL,
            year INTEGER NOT NULL,
            subject_name TEXT NOT NULL,
            subject_type TEXT CHECK(subject_type IN ('Theory', 'Lab', 'Project', 'Skill')) NOT NULL,
            hours_per_week INTEGER NOT NULL,
            faculty_id INTEGER,
            PRIMARY KEY (subject_code, year),
            FOREIGN KEY (faculty_id) REFERENCES Faculty(faculty_id)
        )
    `);

    console.log('Subjects table recreated with expanded subject_type constraint.');
    db.close();
});
