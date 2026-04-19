const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const db = new sqlite3.Database('./database/timetable.db');

const targetNames = [
    "Dr Shaik Johnmohhammad Pasha"
];

db.serialize(() => {
    console.log("Locating faculty IDs to delete...");
    const placeholders = targetNames.map(() => '?').join(',');
    
    // Check their IDs first
    db.all(`SELECT faculty_id, faculty_name FROM faculty WHERE faculty_name IN (${placeholders})`, targetNames, (err, rows) => {
        if (err) throw err;
        
        console.log("Found faculties to delete:", rows);
        const ids = rows.map(r => r.faculty_id);
        
        if (ids.length === 0) {
            console.log("No faculties found matching the names.");
            db.close();
            return;
        }

        console.log("Clearing their timetable entries (setting them to 0)");
        const idPlaceholders = ids.map(() => '?').join(',');
        
        db.run(`UPDATE timetable SET faculty_id = 0 WHERE faculty_id IN (${idPlaceholders})`, ids, function(err) {
            if (err) console.error(err);
            console.log(`Unassigned ${this.changes} timetable entries.`);
            
            // Delete from faculty table
            db.run(`DELETE FROM faculty WHERE faculty_id IN (${idPlaceholders})`, ids, function(err) {
                if (err) console.error(err);
                console.log(`Successfully deleted ${this.changes} rows from the faculty table.`);
                
                // Sweep JSON map
                console.log("Sweeping faculty_mapping.json...");
                const mappingPath = './faculty_mapping.json';
                if (fs.existsSync(mappingPath)) {
                    const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
                    let swept = 0;
                    for (const [sectionId, subjects] of Object.entries(mapping)) {
                        for (const [subject, facultyId] of Object.entries(subjects)) {
                            if (ids.includes(facultyId)) {
                                mapping[sectionId][subject] = 0;
                                swept++;
                            }
                        }
                    }
                    if (swept > 0) {
                        fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), 'utf8');
                        console.log(`Cleared ${swept} mapping entries from JSON.`);
                    } else {
                        console.log("No JSON mapping entries needed sweeping.");
                    }
                }
                db.close();
            });
        });
    });
});
