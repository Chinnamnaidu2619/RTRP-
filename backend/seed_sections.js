const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'timetable.db');
const db = new sqlite3.Database(dbPath);

const YEARS = [2, 3, 4];
const SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

db.serialize(() => {
    // Optional: Clear existing sections to avoid duplicates or mess
    // db.run('DELETE FROM Sections');
    
    const stmt = db.prepare('INSERT INTO Sections (section_name, year) SELECT ?, ? WHERE NOT EXISTS(SELECT 1 FROM Sections WHERE section_name = ? AND year = ?)');
    
    let addedCount = 0;
    YEARS.forEach(year => {
        SECTIONS.forEach(secName => {
            const fullName = `${year}-CSE-${secName}`;
            stmt.run(fullName, year, fullName, year);
            addedCount++;
        });
    });

    stmt.finalize(() => {
        console.log(`Ensured ${addedCount} standard sections are present in the database.`);
        db.close();
    });
});
