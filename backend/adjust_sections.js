const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/timetable.db');

db.all('SELECT section_id, section_name, year FROM Sections ORDER BY year, section_name', (err, rows) => {
    if (err) return console.error(err);
    console.log(`Current Sections Count: ${rows.length}`);
    
    if (rows.length > 21) {
        const toRemove = rows.length - 21;
        console.log(`Removing ${toRemove} sections to match 21 sections requirement...`);
        
        // Remove the last 'toRemove' sections
        const idsToRemove = rows.slice(21).map(r => r.section_id);
        const placeholders = idsToRemove.map(() => '?').join(',');
        
        db.run(`DELETE FROM Sections WHERE section_id IN (${placeholders})`, idsToRemove, function(err) {
            if (err) console.error(err);
            else console.log(`${this.changes} sections removed. New count: 21.`);
            db.close();
        });
    } else {
        console.log('Sections count is already 21 or less.');
        db.close();
    }
});
