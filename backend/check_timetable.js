const db = require('./db');
const facultyId = 202; // Ms. J Chaitanya

const query = `
    SELECT t.id, t.day, t.period, s.section_name, s.year, sub.subject_name, sub.subject_type, r.room_id
    FROM Timetable t
    JOIN Sections s ON t.section_id = s.section_id
    JOIN Subjects sub ON t.subject_code = sub.subject_code AND sub.year = s.year
    JOIN Rooms r ON t.room_id = r.room_id
    WHERE t.faculty_id = ?
    ORDER BY s.year, t.day, t.period
`;

db.all(query, [facultyId], (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log('Query Result Count:', rows.length);
    if (rows.length > 0) {
        console.log('Sample Row:', JSON.stringify(rows[0], null, 2));
    } else {
        console.log('No rows returned for facultyId:', facultyId);
        
        // Debug: check which join failed
        db.all('SELECT * FROM Timetable WHERE faculty_id = ?', [facultyId], (err, tRows) => {
            console.log('Timetable rows for faculty:', tRows.length);
            if (tRows.length > 0) {
                const t = tRows[0];
                db.get('SELECT * FROM Sections WHERE section_id = ?', [t.section_id], (err, s) => {
                    console.log('Section for row:', s);
                    db.get('SELECT * FROM Subjects WHERE subject_code = ?', [t.subject_code], (err, sub) => {
                        console.log('Subject(s) for row:', sub);
                        db.get('SELECT * FROM Rooms WHERE room_id = ?', [t.room_id], (err, r) => {
                            console.log('Room for row:', r);
                        });
                    });
                });
            }
        });
    }
});
