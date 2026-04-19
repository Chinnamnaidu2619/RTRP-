const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const db = new sqlite3.Database('./database/timetable.db');

const fetchAll = (query) => new Promise((resolve, reject) => {
    db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

async function reassign() {
    try {
        const sections = await fetchAll('SELECT * FROM Sections');
        const subjects = await fetchAll('SELECT * FROM Subjects');
        const faculty = await fetchAll('SELECT * FROM Faculty WHERE faculty_id < 1000'); // Standard faculty
        const dummyFaculty = await fetchAll('SELECT * FROM Faculty WHERE faculty_id > 1000'); // Dummy specials

        const facultyWorkload = {};
        const facultySubjectCount = {}; 
        faculty.forEach(f => {
            facultyWorkload[f.faculty_id] = 0;
            facultySubjectCount[f.faculty_id] = {};
        });

        const mapping = {};
        const academicAssignments = [];

        for (const section of sections) {
            mapping[section.section_id] = {};
            const sectionSubjects = subjects.filter(s => s.year === section.year);
            
            for (const subject of sectionSubjects) {
                // SPECIALS: Map to their respective dummy IDs
                if (['Library', 'Sports', 'Counselling'].includes(subject.subject_name)) {
                    // Match dummy by name: "Library_2-CSE-A"
                    const dummyFac = dummyFaculty.find(f => f.faculty_name === `${subject.subject_name}_${section.section_name}`);
                    if (dummyFac) {
                        mapping[section.section_id][subject.subject_code] = dummyFac.faculty_id;
                    }
                } else {
                    academicAssignments.push({ section, subject });
                }
            }
        }

        // Shuffle academic assignments
        for (let i = academicAssignments.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [academicAssignments[i], academicAssignments[j]] = [academicAssignments[j], academicAssignments[i]];
        }

        for (const { section, subject } of academicAssignments) {
            const subCode = subject.subject_code;
            
            // Priority: Max spread (<=2 sections) and lowest workload
            faculty.sort((a, b) => {
                const countA = facultySubjectCount[a.faculty_id][subCode] || 0;
                const countB = facultySubjectCount[b.faculty_id][subCode] || 0;
                if (countA !== countB) return countA - countB;
                return facultyWorkload[a.faculty_id] - facultyWorkload[b.faculty_id];
            });

            const selectedFaculty = faculty[0];
            mapping[section.section_id][subject.subject_code] = selectedFaculty.faculty_id;
            facultyWorkload[selectedFaculty.faculty_id] += subject.hours_per_week;
            facultySubjectCount[selectedFaculty.faculty_id][subCode] = (facultySubjectCount[selectedFaculty.faculty_id][subCode] || 0) + 1;
        }

        fs.writeFileSync('faculty_mapping.json', JSON.stringify(mapping, null, 2));
        console.log('Balanced Academic Mapping + Dummy Specials Generated.');
        db.close();
    } catch (err) { console.error(err); }
}

reassign();
