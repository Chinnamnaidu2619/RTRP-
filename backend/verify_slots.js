const db = require('./db');
setTimeout(() => {
    // Count directly from Timetable — no join needed
    db.all(`SELECT s.section_name, s.year, COUNT(*) as scheduled
            FROM Timetable t JOIN Sections s ON t.section_id = s.section_id
            GROUP BY t.section_id ORDER BY s.year, s.section_name`, [], (e, rows) => {
        let allGood = true;
        rows.forEach(r => {
            const free = 36 - r.scheduled;
            const ok = r.scheduled === 33 && free === 3;
            if (!ok) allGood = false;
            console.log(`${ok?'✓':'✗'} ${r.section_name}: ${r.scheduled} classes, ${free} free`);
        });
        console.log(allGood ? '\nAll sections: 33 classes + 3 free ✓' : '\nSome sections have wrong counts!');
    });
}, 600);
