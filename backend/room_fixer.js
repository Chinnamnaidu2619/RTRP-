const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/timetable.db');

db.serialize(() => {
    // 1. Get all classrooms
    db.all("SELECT room_id FROM Rooms WHERE room_type = 'Classroom'", (err, rows) => {
        const count = rows.length;
        console.log(`Current classrooms: ${count}`);
        
        if (count < 21) {
            const needed = 21 - count;
            console.log(`Adding ${needed} more rooms...`);
            for (let i = 1; i <= needed; i++) {
                const id = `EXTRA_${i}`;
                db.run("INSERT OR IGNORE INTO Rooms (room_id, room_type) VALUES (?, 'Classroom')", [id]);
            }
        }
        
        // 2. Also ensure 5 labs exist
        db.all("SELECT room_id FROM Rooms WHERE room_type = 'Lab'", (err, labRows) => {
            const labCount = labRows.length;
            if (labCount < 5) {
                const needed = 5 - labCount;
                for (let i = 1; i <= needed; i++) {
                    const id = `LAB_EXTRA_${i}`;
                    db.run("INSERT OR IGNORE INTO Rooms (room_id, room_type) VALUES (?, 'Lab')", [id]);
                }
            }
            console.log('Rooms verified and supplemented.');
            db.close();
        });
    });
});
