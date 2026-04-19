const { generateTimetable } = require('./services/generator');
const db = require('./db');

async function runQuery(query, params = []) {
    return new Promise((resolve, reject) => {
        db.run(query, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function runTest() {
    console.log('--- Starting Conflict Detection Test ---');
    
    try {
        // Clear DB in safe order
        await runQuery('DELETE FROM Timetable');
        await runQuery('DELETE FROM TimeSlots');
        await runQuery('DELETE FROM Subjects');
        await runQuery('DELETE FROM Faculty');
        await runQuery('DELETE FROM Sections');
        await runQuery('DELETE FROM Rooms');

        // TEST 1: Faculty Over-scheduling
        console.log('\nTEST 1: Faculty Over-scheduling (40 hours)');
        await runQuery("INSERT INTO Faculty (faculty_id, faculty_name, department, email, password) VALUES (1, 'Test Faculty', 'CSE', 'test@test.com', 'hash')");
        await runQuery("INSERT INTO Sections (section_id, section_name, year) VALUES (1, 'CSE-A', 1)");
        await runQuery("INSERT INTO Subjects (subject_code, year, subject_name, subject_type, hours_per_week, faculty_id) VALUES ('SUB1', 1, 'Subject 1', 'Theory', 40, 1)");
        await runQuery("INSERT INTO Rooms (room_id, room_type, capacity) VALUES (1, 'Classroom', 60)");

        try {
            await generateTimetable();
            console.error('FAIL: TEST 1 should have failed');
        } catch (e) {
            console.log('SUCCESS: TEST 1 caught conflict:', e.message);
        }

        // TEST 2: Insufficient Lab Rooms
        console.log('\nTEST 2: Insufficient Lab Rooms');
        await runQuery('DELETE FROM Subjects');
        await runQuery('DELETE FROM Rooms');
        
        // 2 sections, 1 lab requiring 20 hours each = 40 hours. Max capacity of 1 room is 36.
        await runQuery("INSERT INTO Sections (section_id, section_name, year) VALUES (2, 'CSE-B', 1)");
        await runQuery("INSERT INTO Subjects (subject_code, year, subject_name, subject_type, hours_per_week, faculty_id) VALUES ('LAB1', 1, 'Lab 1', 'Lab', 20, 1)");
        await runQuery("INSERT INTO Rooms (room_id, room_type, capacity) VALUES (2, 'Lab', 30)");

        try {
            await generateTimetable();
            console.error('FAIL: TEST 2 should have failed');
        } catch (e) {
            console.log('SUCCESS: TEST 2 caught conflict:', e.message);
        }

        console.log('\n--- Tests Completed ---');
    } catch (err) {
        console.error('Test script error:', err);
    } finally {
        // Don't close DB if generator might still need it in some edge case async wait, 
        // but here it should be fine.
        setTimeout(() => db.close(), 1000);
    }
}

runTest();
