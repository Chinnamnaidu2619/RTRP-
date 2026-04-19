const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/timetable.db');

db.serialize(() => {
    db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='faculty'", (err, rows) => {
        if (err) console.error(err);
        console.log("Faculty Table Schema:", rows);
    });

    db.all("SELECT * FROM faculty", (err, rows) => {
        if (err) console.error(err);
        const matches = rows.filter(r => {
             const name = r.faculty_name || "";
             return name.includes("Jostna") || 
                    name.includes("Sirajuddin") || 
                    name.includes("Johnmohhammad") || 
                    name.includes("Umrez") || 
                    name.includes("Hrudayamma") || 
                    name.includes("Rajgopal");
        });
        console.log("Matches:", matches);
    });

    db.all("SELECT section_id, slot_id, subject_id, faculty_id FROM timetable WHERE subject_id IN ('A6HS08', 'A6HS12', 'A6HS15', 'A6CS26')", (err, rows) => {
        if (err) console.error(err);
        console.log("Timetable current mappings for these subjects:", rows.slice(0, 10)); // just look at first 10
    });
});
