const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const db = new sqlite3.Database('./database/timetable.db');

const newFacultyNames = [
    "Faculty 1",
    "Faculty 2",
    "Faculty 3",
    "Faculty 4",
    "Faculty 5"
];

db.serialize(() => {
    // Delete the incorrectly created faculty rows to be safe
    db.run("DELETE FROM faculty WHERE faculty_name LIKE 'Faculty %'", function(err) {
        if(err) console.error(err);
        
        let inserts = 0;
        const insertStmt = db.prepare("INSERT INTO faculty (faculty_name, department, email, password) VALUES (?, 'MBA', ?, '$2b$10$zf.AbRFbdVeByZPkgNJNTO/WDF8r8cEMgmtYB7eu.qIQIbPt8vjhW')");
        
        for (let i = 0; i < 5; i++) {
            const name = newFacultyNames[i];
            const email = `faculty${i+1}@mlrit.ac.in`;
            insertStmt.run(name, email, function(err) {
                if (err) console.error(err);
                inserts++;
                if (inserts === 5) {
                    processMappings();
                }
            });
        }
        insertStmt.finalize();
    });

    function processMappings() {
        db.all("SELECT faculty_id, faculty_name FROM faculty WHERE faculty_name LIKE 'Faculty %'", (err, facultyRows) => {
            if (err) throw err;
            const newFacultyIds = facultyRows.map(r => r.faculty_id).sort();
            console.log("New Faculty IDs:", newFacultyIds);
            
            console.log("Updating faculty_mapping.json...");
            const mappingPath = './faculty_mapping.json';
            const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
            let counter = 0;
            
            for (const [sectionId, subjects] of Object.entries(mapping)) {
                for (const [subject, facultyId] of Object.entries(subjects)) {
                    if (['A6HS08', 'A6HS12', 'A6HS15'].includes(subject)) {
                        mapping[sectionId][subject] = newFacultyIds[counter % newFacultyIds.length];
                        counter++;
                    }
                }
            }
            fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), 'utf8');

            console.log("Updating timetable DB entries...");
            db.all("SELECT id, subject_code FROM timetable WHERE subject_code IN ('A6HS08', 'A6HS12', 'A6HS15')", (err, timetableRows) => {
                if (err) throw err;
                
                const updateStmt = db.prepare("UPDATE timetable SET faculty_id = ? WHERE id = ?");
                let dbCounter = 0;
                for (const row of timetableRows) {
                    updateStmt.run(newFacultyIds[dbCounter % newFacultyIds.length], row.id);
                    dbCounter++;
                }
                updateStmt.finalize();
                console.log(`Re-mapped ${dbCounter} timetable entries to Faculty 1-5.`);
                db.close();
            });
        });
    }
});
