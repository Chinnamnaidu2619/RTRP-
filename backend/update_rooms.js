const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/timetable.db');

db.serialize(() => {
    db.run('DELETE FROM Timetable');
    db.run('DELETE FROM Rooms');
    
    const stmt = db.prepare('INSERT INTO Rooms (room_id, room_type, capacity) VALUES (?, ?, ?)');
    
    // MG101...MG107 (Year 2)
    for (let i = 1; i <= 7; i++) {
        stmt.run(`MG10${i}`, 'Classroom', 60);
    }
    // MG201...MG207 (Year 3)
    for (let i = 1; i <= 7; i++) {
        stmt.run(`MG20${i}`, 'Classroom', 60);
    }
    // MG301...MG307 (Year 4)
    for (let i = 1; i <= 7; i++) {
        stmt.run(`MG30${i}`, 'Classroom', 60);
    }
    
    stmt.finalize(() => {
        console.log('21 Rooms inserted successfully.');
        db.close();
    });
});
