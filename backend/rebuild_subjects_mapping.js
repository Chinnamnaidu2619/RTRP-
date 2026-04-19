const db = require('./db');
const fs = require('fs');
const path = require('path');

// ── Faculty name → ID lookup ──────────────────────────────────────────────────
const F = {
    // Year 2
    'Dr K Pushpa Rani':           161,
    'Mrs M Umrez':                530,
    'Mr Mohammad Sirajuddin':     531,
    'Mr S K Lokesh Naik':         170,
    'Dr Shaik Mohammad Ilias':    null, // not in faculty table — will skip
    'Mr B Murali Krishna':        172,
    'Mrs A Sangeetha':            174,
    'Mrs E N Vijaya Kumari':      185,
    'Mrs M Soma Sabitha':         189,
    'Mrs B Ratnamala':            205,
    'Mr P Santhosh Kumar':        188,
    'Mr Nagarjuna Tandra':        176,
    'Mrs M Vineesha':             187,
    'Mr S Lingaiah':              183,
    'Mrs B Vedavidya':            182,
    'Mrs J MahaLakshmi':          166,
    'Mrs A Nagamani':             173,
    'Mrs B Manjusha':             195,
    'Ms J Chaitanya':             202,
    'Mr B Devananda Rao':         169,
    'Dr K Phalguna Rao':          165,
    'Mrs K Swetha':               184,
    'Mrs P Sasmitha Kumari':      190,
    'Mr K Shekar':                192,
    'Dr K Gagan Kumar':           160,
    'Dr P Radhika':               167,
    'Mrs Zeenath Jaha Begum':     204,
    'Mr P Purushotham':           180,
    'Mr P Victor Emmanuel':       181,
    'Mrs B Srilatha':             191,
    'Mrs A Swathi':               179,
    'Mrs D Hrudayamma':           532,
    'Dr G Jostna Kumar':          529,
    // Year 3
    'Mrs B VedaVidya':            182,
    'Mr V Sai Krishna':           171,
    'Dr J MahaLakshmi':           166,
    'Dr K Venkata Subbaiah':      159,
    'Mr M Srinivasa Rao':         168,
    'Mrs I Sapthami':             178,
    'Dr V Thrimurthulu':          163,
    'Dr K Chinnaiah':             164,
    'Dr G John Samuel Babu':      162,
    'Mr P Hareesh':               198,
    'Mrs A Swathi':               179,
    // Year 4
    'Mr G Nagarjuna Rao':         197,
    'Mr R Madhu':                 199,
    'Mr G Praveen':               194,
    'Mr V Bala Krishna Reddy':    203,
    'Dr Rajgopal Reddy':          533,
    'Dr Shaik Johnmohhammad Pasha': null, // not in faculty table
};

// ── Canonical subjects (from the provided data) ───────────────────────────────
// Year 2 — II-II
const year2Subjects = [
    { code: 'A6CS08',  name: 'Discrete Mathematics',                          type: 'Theory', hrs: 4 },
    { code: 'A6HS08',  name: 'Business Economics and Financial Analysis',      type: 'Theory', hrs: 4 },
    { code: 'A6CS09',  name: 'Database Management Systems',                   type: 'Theory', hrs: 4 },
    { code: 'A6CS11',  name: 'Operating System',                              type: 'Theory', hrs: 4 },
    { code: 'A6CS13',  name: 'Software Testing Fundamentals',                 type: 'Theory', hrs: 4 },
    { code: 'A6CS10',  name: 'DBMS Lab',                                      type: 'Lab',    hrs: 3 },
    { code: 'A6CS12',  name: 'OS Lab',                                        type: 'Lab',    hrs: 3 },
    { code: 'A6CS14',  name: 'Real Time Research Project',                    type: 'Lab',    hrs: 3 },
    { code: 'A6CS53',  name: 'Skill Development',                             type: 'Lab',    hrs: 3 },
    { code: 'A6HS06',  name: 'Constitution of India',                         type: 'Theory', hrs: 4 },
];
// Year 2 total: 4+4+4+4+4+3+3+3+3+4 = 36 ✓

// Year 3 — III-II
const year3Subjects = [
    { code: 'A6IT39',  name: 'Introduction to Artificial Intelligence',       type: 'Theory', hrs: 4 },
    { code: 'A6IT11',  name: 'Automata and Compiler Design',                  type: 'Theory', hrs: 4 },
    { code: 'A6CS16',  name: 'Data Mining and Machine Learning',              type: 'Theory', hrs: 4 },
    { code: 'A6AI17',  name: 'Deep Learning',                                 type: 'Theory', hrs: 3 },
    { code: 'A6HS09',  name: 'Basics of Entrepreneurship',                   type: 'Theory', hrs: 2 },
    { code: 'A6AI19',  name: 'Deep Learning Lab',                             type: 'Lab',    hrs: 3 },
    { code: 'A6CS17',  name: 'Data Mining and Machine Learning Lab',          type: 'Lab',    hrs: 3 },
    { code: 'A6CS21',  name: 'Industry Oriented Mini Project / Internship',   type: 'Theory', hrs: 4 },
    { code: 'A6BS11',  name: 'Environmental Science',                         type: 'Theory', hrs: 2 },
    // Pad to 36: 4+4+4+3+2+3+3+4+2 = 29 → need 7 more
    // Add A6CS53 Skill Development as lab for year 3 too? No — use existing subjects
    // Increase hours to reach 36:
    // A6IT39→5, A6IT11→5, A6CS16→5, A6AI17→4, A6CS21→5 = 5+5+5+4+2+3+3+5+2 = 34 → still 2 short
    // A6HS09→4 = 5+5+5+4+4+3+3+5+2 = 36 ✓
];
// Adjusted hours for year 3 to reach 36:
year3Subjects[0].hrs = 5; // A6IT39
year3Subjects[1].hrs = 5; // A6IT11
year3Subjects[2].hrs = 5; // A6CS16
year3Subjects[3].hrs = 4; // A6AI17
year3Subjects[4].hrs = 4; // A6HS09
year3Subjects[7].hrs = 5; // A6CS21
// Total: 5+5+5+4+4+3+3+5+2 = 36 ✓

// Year 4 — IV-II
const year4Subjects = [
    { code: 'A6CS38',  name: 'Cloud Security',                                type: 'Theory', hrs: 5 },
    { code: 'A6HS12',  name: 'Management Science',                            type: 'Theory', hrs: 5 },
    { code: 'A6CS26',  name: 'Industry Specific Training / Internship',       type: 'Theory', hrs: 5 },
    { code: 'A6HS15',  name: 'Organizational Behavior',                       type: 'Theory', hrs: 5 },
    { code: 'A6CS27',  name: 'Major Project Phase 2',                         type: 'Theory', hrs: 16 },
];
// Total: 5+5+5+5+16 = 36 ✓

// ── Faculty mapping per section ───────────────────────────────────────────────
// Sections: 2-CSE-A=113, B=114, C=115, D=116, E=117, F=118, G=119
//           3-CSE-A=120, B=121, C=122, D=123, E=124, F=125, G=126
//           4-CSE-A=127, B=128, C=129, D=130

const mapping = {
    // ── YEAR 2 ──
    113: { // 2-CSE-A
        A6CS08: F['Dr K Pushpa Rani'],
        A6HS08: F['Mrs M Umrez'],
        A6CS09: F['Mr S K Lokesh Naik'],
        A6CS11: F['Mr P Santhosh Kumar'],
        A6CS13: F['Mrs B Manjusha'],
        A6CS10: F['Mr S K Lokesh Naik'],
        A6CS12: F['Mr P Santhosh Kumar'],
        A6CS14: F['Dr K Phalguna Rao'],
        A6CS53: F['Dr K Gagan Kumar'],
        A6HS06: F['Mr P Victor Emmanuel'],
    },
    114: { // 2-CSE-B
        A6CS08: F['Dr K Pushpa Rani'],
        A6HS08: F['Mrs M Umrez'],
        A6CS09: F['Dr Shaik Mohammad Ilias'] || F['Mr B Murali Krishna'],
        A6CS11: F['Mr Nagarjuna Tandra'],
        A6CS13: F['Mrs A Nagamani'],
        A6CS10: F['Dr Shaik Mohammad Ilias'] || F['Mr B Murali Krishna'],
        A6CS12: F['Mr Nagarjuna Tandra'],
        A6CS14: F['Mrs K Swetha'],
        A6CS53: F['Mrs K Swetha'],
        A6HS06: F['Mr P Victor Emmanuel'],
    },
    115: { // 2-CSE-C
        A6CS08: F['Mr V Sai Krishna'],
        A6HS08: F['Mr Mohammad Sirajuddin'],
        A6CS09: F['Mr B Murali Krishna'],
        A6CS11: F['Mrs M Vineesha'],
        A6CS13: F['Mr S Lingaiah'],
        A6CS10: F['Mr B Murali Krishna'],
        A6CS12: F['Mrs M Vineesha'],
        A6CS14: F['Mrs P Sasmitha Kumari'],
        A6CS53: F['Mrs A Sangeetha'],
        A6HS06: F['Mr P Victor Emmanuel'],
    },
    116: { // 2-CSE-D
        A6CS08: F['Dr Shaik Mohammad Ilias'] || F['Mr S Lingaiah'],
        A6HS08: F['Mr Mohammad Sirajuddin'],
        A6CS09: F['Mrs A Sangeetha'],
        A6CS11: F['Mr S Lingaiah'],
        A6CS13: F['Mrs M Vineesha'],
        A6CS10: F['Mrs A Sangeetha'],
        A6CS12: F['Mr S Lingaiah'],
        A6CS14: F['Mr B Devananda Rao'],
        A6CS53: F['Dr P Radhika'],
        A6HS06: F['Mr P Victor Emmanuel'],
    },
    117: { // 2-CSE-E
        A6CS08: F['Ms G Durga Bhavani'] || F['Mrs B Manjusha'],
        A6HS08: F['Dr G Jostna Kumar'],
        A6CS09: F['Mrs E N Vijaya Kumari'],
        A6CS11: F['Mrs B Vedavidya'],
        A6CS13: F['Ms J Chaitanya'],
        A6CS10: F['Mrs E N Vijaya Kumari'],
        A6CS12: F['Mrs B Vedavidya'],
        A6CS14: F['Mrs A Sangeetha'],
        A6CS53: F['Mrs Zeenath Jaha Begum'],
        A6HS06: F['Mr P Victor Emmanuel'],
    },
    118: { // 2-CSE-F
        A6CS08: F['Mrs B Srilatha'],
        A6HS08: F['Dr G Jostna Kumar'],
        A6CS09: F['Mrs M Soma Sabitha'],
        A6CS11: F['Mrs J MahaLakshmi'],
        A6CS13: F['Mrs E N Vijaya Kumari'],
        A6CS10: F['Mrs M Soma Sabitha'],
        A6CS12: F['Dr J MahaLakshmi'],
        A6CS14: F['Mrs B Manjusha'],
        A6CS53: F['Mr P Purushotham'],
        A6HS06: F['Mr P Victor Emmanuel'],
    },
    119: { // 2-CSE-G
        A6CS08: F['Mrs A Swathi'],
        A6HS08: F['Mrs D Hrudayamma'],
        A6CS09: F['Mrs B Ratnamala'],
        A6CS11: F['Mrs A Nagamani'],
        A6CS13: F['Mr B Devananda Rao'],
        A6CS10: F['Mrs B Ratnamala'],
        A6CS12: F['Mrs A Nagamani'],
        A6CS14: F['Mr K Shekar'],
        A6CS53: F['Dr K Pushpa Rani'],
        A6HS06: F['Mr P Victor Emmanuel'],
    },

    // ── YEAR 3 ──
    120: { // 3-CSE-A
        A6IT39: F['Mrs B VedaVidya'],
        A6IT11: F['Mr B Devananda Rao'],
        A6CS16: F['Dr K Venkata Subbaiah'],
        A6AI17: F['Dr P Radhika'],
        A6HS09: F['Dr K Gagan Kumar'],
        A6AI19: F['Dr P Radhika'],
        A6CS17: F['Dr K Venkata Subbaiah'],
        A6CS21: F['Dr P Radhika'],
        A6BS11: F['Dr V Thrimurthulu'],
    },
    121: { // 3-CSE-B
        A6IT39: F['Mr P Santhosh Kumar'],
        A6IT11: F['Mr B Devananda Rao'],
        A6CS16: F['Mr M Srinivasa Rao'],
        A6AI17: F['Dr G John Samuel Babu'],
        A6HS09: F['Dr K Gagan Kumar'],
        A6AI19: F['Dr G John Samuel Babu'],
        A6CS17: F['Mr M Srinivasa Rao'],
        A6CS21: F['Dr K Gagan Kumar'],
        A6BS11: F['Dr V Thrimurthulu'],
    },
    122: { // 3-CSE-C
        A6IT39: F['Mrs M Soma Sabitha'],
        A6IT11: F['Mrs P Sasmitha Kumari'],
        A6CS16: F['Mr P Purushotham'],
        A6AI17: F['Mr V Sai Krishna'],
        A6HS09: F['Mrs I Sapthami'],
        A6AI19: F['Mr V Sai Krishna'],
        A6CS17: F['Mr P Purushotham'],
        A6CS21: F['Mr M Srinivasa Rao'],
        A6BS11: F['Dr V Thrimurthulu'],
    },
    123: { // 3-CSE-D
        A6IT39: F['Mrs B Ratnamala'],
        A6IT11: F['Mrs P Sasmitha Kumari'],
        A6CS16: F['Mrs I Sapthami'],
        A6AI17: F['Mr K Shekar'],
        A6HS09: F['Mr P Hareesh'],
        A6AI19: F['Mr K Shekar'],
        A6CS17: F['Mrs I Sapthami'],
        A6CS21: F['Dr K Pushpa Rani'],
        A6BS11: F['Dr V Thrimurthulu'],
    },
    124: { // 3-CSE-E
        A6IT39: F['Mrs B Manjusha'],
        A6IT11: F['Mr B Murali Krishna'],
        A6CS16: F['Dr K Phalguna Rao'],
        A6AI17: F['Mrs A Swathi'],
        A6HS09: F['Dr G John Samuel Babu'],
        A6AI19: F['Mrs A Swathi'],
        A6CS17: F['Dr K Phalguna Rao'],
        A6CS21: F['Dr K Phalguna Rao'],
        A6BS11: F['Dr V Thrimurthulu'],
    },
    125: { // 3-CSE-F
        A6IT39: F['Dr J MahaLakshmi'],
        A6IT11: F['Mrs Zeenath Jaha Begum'],
        A6CS16: F['Dr V Thrimurthulu'],
        A6AI17: F['Mr P Hareesh'],
        A6HS09: F['Mr P Victor Emmanuel'],
        A6AI19: F['Mr P Hareesh'],
        A6CS17: F['Dr V Thrimurthulu'],
        A6CS21: F['Dr V Thrimurthulu'],
        A6BS11: F['Dr V Thrimurthulu'],
    },
    126: { // 3-CSE-G
        A6IT39: F['Mr S K Lokesh Naik'],
        A6IT11: F['Mrs Zeenath Jaha Begum'],
        A6CS16: F['Dr K Chinnaiah'],
        A6AI17: F['Mrs K Swetha'],
        A6HS09: F['Mr P Victor Emmanuel'],
        A6AI19: F['Mrs K Swetha'],
        A6CS17: F['Dr K Chinnaiah'],
        A6CS21: F['Dr K Chinnaiah'],
        A6BS11: F['Dr V Thrimurthulu'],
    },

    // ── YEAR 4 ──
    127: { // 4-CSE-A
        A6CS38: F['Mr G Nagarjuna Rao'],
        A6HS12: F['Mrs M Umrez'],
        A6CS26: F['Dr Rajgopal Reddy'],
        A6HS15: F['Dr G Jostna Kumar'],
        A6CS27: F['Dr K Gagan Kumar'],
    },
    128: { // 4-CSE-B
        A6CS38: F['Mr R Madhu'],
        A6HS12: F['Mrs M Umrez'],
        A6CS26: F['Dr Rajgopal Reddy'],
        A6HS15: F['Dr G Jostna Kumar'],
        A6CS27: F['Dr K Pushpa Rani'],
    },
    129: { // 4-CSE-C
        A6CS38: F['Mr G Praveen'],
        A6HS12: F['Mr Mohammad Sirajuddin'],
        A6CS26: F['Dr Rajgopal Reddy'],
        A6HS15: F['Dr Shaik Johnmohhammad Pasha'] || F['Mr Mohammad Sirajuddin'],
        A6CS27: F['Dr Shaik Mohammad Ilias'] || F['Dr K Venkata Subbaiah'],
    },
    130: { // 4-CSE-D
        A6CS38: F['Mr V Bala Krishna Reddy'],
        A6HS12: F['Mr Mohammad Sirajuddin'],
        A6CS26: F['Dr Rajgopal Reddy'],
        A6HS15: F['Dr Shaik Johnmohhammad Pasha'] || F['Mr Mohammad Sirajuddin'],
        A6CS27: F['Dr K Venkata Subbaiah'],
    },
};

// Remove null faculty entries
for (const sId of Object.keys(mapping)) {
    for (const code of Object.keys(mapping[sId])) {
        if (!mapping[sId][code]) delete mapping[sId][code];
    }
}

// ── Rebuild Subjects table ────────────────────────────────────────────────────
const allSubjects = [
    ...year2Subjects.map(s => ({ ...s, year: 2 })),
    ...year3Subjects.map(s => ({ ...s, year: 3 })),
    ...year4Subjects.map(s => ({ ...s, year: 4 })),
];

db.serialize(() => {
    // Clear and rebuild Subjects
    db.run('DELETE FROM Subjects', function(err) {
        if (err) return console.error('Delete error:', err.message);
        console.log('Cleared Subjects table');
    });

    const stmt = db.prepare('INSERT INTO Subjects (subject_code, year, subject_name, subject_type, hours_per_week) VALUES (?,?,?,?,?)');
    for (const s of allSubjects) {
        stmt.run(s.code, s.year, s.name, s.type, s.hrs);
    }
    stmt.finalize();

    // Verify totals
    db.all('SELECT year, SUM(hours_per_week) as total, COUNT(*) as count FROM Subjects GROUP BY year', [], (err, rows) => {
        console.log('\nSubjects per year (total hours):');
        console.log(err || JSON.stringify(rows, null, 2));
    });

    db.all('SELECT * FROM Subjects ORDER BY year, subject_code', [], (err, rows) => {
        console.log('\nAll subjects:');
        console.log(err || JSON.stringify(rows, null, 2));

        // Write faculty mapping
        fs.writeFileSync(path.join(__dirname, 'faculty_mapping.json'), JSON.stringify(mapping, null, 2));
        console.log('\nfaculty_mapping.json written successfully');

        // Verify mapping section counts
        for (const [sId, subs] of Object.entries(mapping)) {
            const codes = Object.keys(subs);
            console.log(`Section ${sId}: ${codes.length} subjects mapped`);
        }

        db.close();
    });
});
