const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database', 'timetable.db');
const db = new sqlite3.Database(dbPath);

const SECTIONS = [
    { name: '2-CSE-A', year: 2 }, { name: '2-CSE-B', year: 2 }, { name: '2-CSE-C', year: 2 }, { name: '2-CSE-D', year: 2 }, { name: '2-CSE-E', year: 2 }, { name: '2-CSE-F', year: 2 }, { name: '2-CSE-G', year: 2 },
    { name: '3-CSE-A', year: 3 }, { name: '3-CSE-B', year: 3 }, { name: '3-CSE-C', year: 3 }, { name: '3-CSE-D', year: 3 }, { name: '3-CSE-E', year: 3 }, { name: '3-CSE-F', year: 3 }, { name: '3-CSE-G', year: 3 },
    { name: '4-CSE-A', year: 4 }, { name: '4-CSE-B', year: 4 }, { name: '4-CSE-C', year: 4 }, { name: '4-CSE-D', year: 4 }, { name: '4-CSE-E', year: 4 }, { name: '4-CSE-F', year: 4 }, { name: '4-CSE-G', year: 4 }
];

const ROOMS = [
    { id: 'MG 101', type: 'Classroom' }, { id: 'MG 102', type: 'Classroom' }, { id: 'MG 103', type: 'Classroom' }, { id: 'MG 104', type: 'Classroom' }, { id: 'MG 105', type: 'Classroom' }, { id: 'MG 106', type: 'Classroom' }, { id: 'MG 107', type: 'Classroom' },
    { id: 'MG 201', type: 'Classroom' }, { id: 'MG 202', type: 'Classroom' }, { id: 'MG 203', type: 'Classroom' }, { id: 'MG 204', type: 'Classroom' }, { id: 'MG 205', type: 'Classroom' }, { id: 'MG 206', type: 'Classroom' }, { id: 'MG 207', type: 'Classroom' },
    { id: 'MG 301', type: 'Classroom' }, { id: 'MG 302', type: 'Classroom' }, { id: 'MG 303', type: 'Classroom' }, { id: 'MG 304', type: 'Classroom' }, { id: 'MG 305', type: 'Classroom' }, { id: 'MG 306', type: 'Classroom' }, { id: 'MG 307', type: 'Classroom' },
    { id: 'MG 001', type: 'Lab' }, { id: 'MG 002', type: 'Lab' }, { id: 'MG 003', type: 'Lab' }, { id: 'MG 004', type: 'Lab' }, { id: 'MG 005', type: 'Lab' }, { id: 'MG 006', type: 'Lab' },
    { id: 'MG 403', type: 'Lab' }, { id: 'MG 404', type: 'Lab' }, { id: 'MG 405', type: 'Lab' }, { id: 'MG 406', type: 'Lab' }
];

const CURRICULUM = {
    2: [
        { name: 'Discrete Mathematics', code: 'A6CS10', type: 'Theory', hours: 3 },
        { name: 'Introductory Statistics', code: 'A6CS11', type: 'Theory', hours: 3 },
        { name: 'Automata Theory', code: 'A6CS14', type: 'Theory', hours: 3 },
        { name: 'Business Economics', code: 'A6II30', type: 'Theory', hours: 3 },
        { name: 'Operating Systems', code: 'A6CS13', type: 'Theory', hours: 3 },
        { name: 'Database Management', code: 'A6CS08', type: 'Theory', hours: 3 },
        { name: 'OS Lab', code: 'A6CS12', type: 'Lab', hours: 3 },
        { name: 'DBMS Lab', code: 'A6CS09', type: 'Lab', hours: 3 },
        { name: 'RTRP', code: 'A6HS08', type: 'Theory', hours: 2 },
        { name: 'Skill Development', code: 'A6HS06', type: 'Theory', hours: 2 },
        { name: 'Constitution of India', code: 'A6II11', type: 'Theory', hours: 2 },
        { name: 'Environmental Science', code: 'A6CS06', type: 'Theory', hours: 1 },
        { name: 'Library', code: 'LIB', type: 'Theory', hours: 1 },
        { name: 'Sports', code: 'SPR', type: 'Theory', hours: 1 },
        { name: 'Counselling', code: 'COU', type: 'Theory', hours: 1 }
    ],
    3: [
        { name: 'Management Systems', code: 'A7CS01', type: 'Theory', hours: 3 },
        { name: 'Software Engineering', code: 'A7CS02', type: 'Theory', hours: 3 },
        { name: 'Data Analysis', code: 'A7CS03', type: 'Theory', hours: 3 },
        { name: 'Discrete Structure', code: 'A7CS04', type: 'Theory', hours: 3 },
        { name: 'Machine Learning', code: 'A7CS05', type: 'Theory', hours: 3 },
        { name: 'AI Techniques', code: 'A7CS06', type: 'Theory', hours: 3 },
        { name: 'SE Lab', code: 'A7CS07', type: 'Lab', hours: 3 },
        { name: 'DA Lab', code: 'A7CS08', type: 'Lab', hours: 3 },
        { name: 'Industry Training', code: 'A7HS01', type: 'Theory', hours: 2 },
        { name: 'Mini Project', code: 'A7HS02', type: 'Theory', hours: 2 },
        { name: 'Soft Skills', code: 'A7HS03', type: 'Theory', hours: 2 },
        { name: 'Ethics', code: 'A7CS09', type: 'Theory', hours: 1 },
        { name: 'Library', code: 'LIB', type: 'Theory', hours: 1 },
        { name: 'Sports', code: 'SPR', type: 'Theory', hours: 1 },
        { name: 'Counselling', code: 'COU', type: 'Theory', hours: 1 }
    ],
    4: [
        { name: 'Cloud Computing', code: 'A8CS01', type: 'Theory', hours: 3 },
        { name: 'Big Data', code: 'A8CS02', type: 'Theory', hours: 3 },
        { name: 'Security', code: 'A8CS03', type: 'Theory', hours: 3 },
        { name: 'IoT', code: 'A8CS04', type: 'Theory', hours: 3 },
        { name: 'Advanced AI', code: 'A8CS05', type: 'Theory', hours: 3 },
        { name: 'Professional Ethics', code: 'A8CS06', type: 'Theory', hours: 3 },
        { name: 'Major Project', code: 'A8HS01', type: 'Lab', hours: 6 },
        { name: 'Internship', code: 'A8HS02', type: 'Theory', hours: 3 },
        { name: 'Seminar', code: 'A8HS03', type: 'Theory', hours: 3 },
        { name: 'Review', code: 'A8HS04', type: 'Theory', hours: 3 },
        { name: 'Library', code: 'LIB', type: 'Theory', hours: 1 },
        { name: 'Sports', code: 'SPR', type: 'Theory', hours: 1 },
        { name: 'Counselling', code: 'COU', type: 'Theory', hours: 1 }
    ]
};

db.serialize(() => {
    db.run('DELETE FROM Timetable');
    db.run('DELETE FROM Sections');
    db.run('DELETE FROM Rooms');
    db.run('DELETE FROM Subjects');
    db.run('DELETE FROM Faculty WHERE faculty_id > 1000'); // Clean old dummies

    console.log('Inserting Sections...');
    const sectionStmt = db.prepare('INSERT INTO Sections (section_name, year) VALUES (?, ?)');
    SECTIONS.forEach(s => sectionStmt.run(s.name, s.year));
    sectionStmt.finalize();

    console.log('Inserting Rooms...');
    const roomStmt = db.prepare('INSERT INTO Rooms (room_id, room_type, capacity) VALUES (?, ?, ?)');
    ROOMS.forEach(r => roomStmt.run(r.id, r.type, 60));
    roomStmt.finalize();

    console.log('Inserting Curricula...');
    const subStmt = db.prepare('INSERT INTO Subjects (subject_code, year, subject_name, subject_type, hours_per_week) VALUES (?, ?, ?, ?, ?)');
    for (const year in CURRICULUM) {
        CURRICULUM[year].forEach(sub => subStmt.run(sub.code, parseInt(year), sub.name, sub.type, sub.hours));
    }
    subStmt.finalize();

    console.log('Adding 63 Dummy Faculty for Non-Academic Activities...');
    const facStmt = db.prepare('INSERT INTO Faculty (faculty_id, faculty_name, department) VALUES (?, ?, ?)');
    let dummyId = 1001;
    SECTIONS.forEach(sec => {
        ['Library', 'Sports', 'Counselling'].forEach(type => {
            facStmt.run(dummyId++, `${type}_${sec.name}`, 'General');
        });
    });
    facStmt.finalize();

    console.log('Database reset complete.');
});
