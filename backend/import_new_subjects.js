const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const db = new sqlite3.Database('./database/timetable.db');

const csvPath = path.join(__dirname, '..', 'New_Subjects_Data.csv');
const data = fs.readFileSync(csvPath, 'utf8').split('\n').filter(line => line.trim() !== '');
const headers = data[0].split(',');
const rows = data.slice(1).map(line => {
    const values = line.split(',');
    const obj = {};
    headers.forEach((h, i) => obj[h.trim()] = values[i]?.trim());
    return obj;
});

db.serialize(() => {
    db.run('DELETE FROM Subjects');
    
    const stmt = db.prepare(`
        INSERT OR REPLACE INTO Subjects (subject_code, year, subject_name, subject_type, hours_per_week, faculty_id) 
        VALUES (?, ?, ?, ?, ?, (SELECT faculty_id FROM Faculty WHERE email LIKE ? OR faculty_name LIKE ? LIMIT 1))
    `);

    let importedCount = 0;

    rows.forEach(row => {
        const email = row.faculty_email.replace('@', ''); // Remove @ if present
        const searchPattern = `%${email}%`;
        
        stmt.run(row.subject_code, row.year, row.subject_name, row.subject_type, row.hours_per_week, searchPattern, searchPattern);
        importedCount++;
    });

    stmt.finalize(() => {
        console.log(`Imported ${importedCount} subjects.`);
        // Double check for NULL faculty_ids
        db.all('SELECT subject_code, subject_name FROM Subjects WHERE faculty_id IS NULL', (err, nullRows) => {
            if (nullRows.length > 0) {
                console.log('\nWARNING: Some subjects have no matching faculty email:');
                nullRows.forEach(r => console.log(`- ${r.subject_code}: ${r.subject_name}`));
            } else {
                console.log('\nAll subjects successfully assigned to faculty.');
            }
            db.close();
        });
    });
});
