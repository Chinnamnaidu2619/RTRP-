const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/timetable.db');

db.serialize(() => {
    // 1. Drop existing tables
    db.run('DROP TABLE IF EXISTS Timetable');
    db.run('DROP TABLE IF EXISTS Rooms');
    
    // 2. Create tables with new schema
    db.run(`
        CREATE TABLE Rooms (
            room_id TEXT PRIMARY KEY,
            room_type TEXT CHECK(room_type IN ('Classroom', 'Lab')) NOT NULL,
            capacity INTEGER NOT NULL
        )
    `);
    
    db.run(`
        CREATE TABLE Timetable (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            section_id INTEGER NOT NULL,
            subject_code TEXT NOT NULL,
            faculty_id INTEGER NOT NULL,
            room_id TEXT NOT NULL,
            day TEXT NOT NULL,
            period INTEGER NOT NULL,
            FOREIGN KEY (section_id) REFERENCES Sections(section_id),
            FOREIGN KEY (subject_code) REFERENCES Subjects(subject_code),
            FOREIGN KEY (faculty_id) REFERENCES Faculty(faculty_id),
            FOREIGN KEY (room_id) REFERENCES Rooms(room_id),
            FOREIGN KEY (day, period) REFERENCES TimeSlots(day, period)
        )
    `);

    // 3. Insert 21 new rooms
    const stmt = db.prepare('INSERT INTO Rooms (room_id, room_type, capacity) VALUES (?, ?, ?)');
    for (let i = 1; i <= 7; i++) stmt.run(`MG10${i}`, 'Classroom', 60);
    for (let i = 1; i <= 7; i++) stmt.run(`MG20${i}`, 'Classroom', 60);
    for (let i = 1; i <= 7; i++) stmt.run(`MG30${i}`, 'Classroom', 60);
    
    stmt.finalize(() => {
        console.log('Database updated: 21 Rooms added with TEXT IDs.');
        db.close();
    });
});
