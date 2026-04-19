const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const db = new sqlite3.Database('./database/timetable.db');

const facultyNames = {
    529: "Faculty 1",
    531: "Faculty 2",
    534: "Faculty 3",
    530: "Faculty 4",
    532: "Faculty 5"
};

const allowedFacultyIds = [529, 531, 534, 530, 532];
const rajgopalId = 533; // Dr.Rajgopal Reddy

let counter = 0;

db.serialize(() => {
    // Note: We already updated the names and faculty_mapping.json in the previous run,
    // but running it again is idempotent for JSON and DB updates as long as conditions match.
    console.log("Updating faculty names...");
    const stmt = db.prepare("UPDATE faculty SET faculty_name = ? WHERE faculty_id = ?");
    for (const [id, name] of Object.entries(facultyNames)) {
        stmt.run(name, id);
    }
    stmt.finalize();
    console.log("Faculty names updated.");

    // Update faculty_mapping.json
    console.log("Updating faculty_mapping.json...");
    const mappingPath = './faculty_mapping.json';
    const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
    
    for (const [sectionId, subjects] of Object.entries(mapping)) {
        for (const [subject, facultyId] of Object.entries(subjects)) {
            if (['A6HS08', 'A6HS12', 'A6HS15'].includes(subject)) {
                if (!allowedFacultyIds.includes(facultyId)) {
                    mapping[sectionId][subject] = allowedFacultyIds[counter % allowedFacultyIds.length];
                    counter++;
                }
            } else if (subject === 'A6CS26') {
                if (facultyId !== rajgopalId) {
                    mapping[sectionId][subject] = rajgopalId;
                }
            }
        }
    }
    fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), 'utf8');
    console.log("faculty_mapping.json updated.");

    // Update timetable entries in DB
    console.log("Updating timetable entries in DB...");
    db.all("SELECT id, subject_code, faculty_id FROM timetable WHERE subject_code IN ('A6HS08', 'A6HS12', 'A6HS15', 'A6CS26')", (err, rows) => {
        if (err) throw err;
        
        let updateCount = 0;
        const updateStmt = db.prepare("UPDATE timetable SET faculty_id = ? WHERE id = ?");
        
        let dbCounter = 0;
        for (const row of rows) {
            if (['A6HS08', 'A6HS12', 'A6HS15'].includes(row.subject_code)) {
                if (!allowedFacultyIds.includes(row.faculty_id)) {
                    updateStmt.run(allowedFacultyIds[dbCounter % allowedFacultyIds.length], row.id);
                    dbCounter++;
                    updateCount++;
                }
            } else if (row.subject_code === 'A6CS26') {
                if (row.faculty_id !== rajgopalId) {
                    updateStmt.run(rajgopalId, row.id);
                    updateCount++;
                }
            }
        }
        updateStmt.finalize();
        console.log(`Updated ${updateCount} timetable rows.`);
    });
});
