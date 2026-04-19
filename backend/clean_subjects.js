const db = require('./db');
setTimeout(() => {
    // 1. Remove subjects where subject_name = subject_code (unnamed junk rows)
    db.run('DELETE FROM Subjects WHERE subject_name = subject_code', [], function(err) {
        if (err) return console.error('Error:', err);
        console.log('Removed unnamed subjects (name=code):', this.changes);
    });

    // 2. Remove the CSV header row
    db.run('DELETE FROM Subjects WHERE subject_code = "Subject Code"', [], function(err) {
        if (err) return console.error('Error:', err);
        console.log('Removed header row:', this.changes);
    });

    // 3. Show what's left for year2
    setTimeout(() => {
        db.all('SELECT subject_code, subject_name, year, subject_type, hours_per_week FROM Subjects WHERE year=2 ORDER BY subject_code', [], (e,r) => {
            console.log('\nYear2 subjects after cleanup:');
            r.forEach(s => console.log(`  ${s.subject_code} | ${s.subject_name} | ${s.subject_type} | ${s.hours_per_week}h`));
        });
    }, 300);
}, 600);
