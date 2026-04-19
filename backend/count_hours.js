const db = require('./db');
const fm = JSON.parse(require('fs').readFileSync('./faculty_mapping.json','utf8'));

setTimeout(() => {
    db.all('SELECT * FROM Subjects', [], (e, subjects) => {
        db.all('SELECT * FROM Sections WHERE section_id IN (113,114,115,116,117,118,119,120,121,122,123,124,125,126,127,128,129,130,131,132,133)', [], (e2, sections) => {
            for (const sec of sections) {
                const mapping = fm[sec.section_id] || {};
                const mappedCodes = Object.keys(mapping);
                const secSubjects = subjects.filter(s => s.year === sec.year && mappedCodes.includes(s.subject_code));
                const totalHours = secSubjects.reduce((sum, s) => sum + s.hours_per_week, 0);
                // Available: 6 days × 5 periods (1-5) = 30 theory slots
                // Labs use 2 slots each but in lab rooms, so they don't block theory slots
                const labHours = secSubjects.filter(s => s.subject_type === 'Lab').reduce((sum, s) => sum + 2, 0); // only 2hr block per lab
                const theoryHours = secSubjects.filter(s => s.subject_type !== 'Lab').reduce((sum, s) => sum + s.hours_per_week, 0);
                const available = 30; // 6 days × 5 periods
                const status = theoryHours > available ? '❌ OVERFLOW' : '✅ OK';
                console.log(`${sec.section_name} (${sec.section_id}): theory=${theoryHours}h, labs=${labHours}h, available=${available} ${status}`);
                if (theoryHours > available) {
                    secSubjects.filter(s => s.subject_type !== 'Lab').forEach(s => 
                        console.log(`    ${s.subject_code} | ${s.subject_name} | ${s.hours_per_week}h`)
                    );
                }
            }
        });
    });
}, 600);
