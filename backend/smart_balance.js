const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const db = new sqlite3.Database('./database/timetable.db');

const fetchAll = (query) => new Promise((resolve, reject) => {
    db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

async function smartBalance() {
    try {
        const sections = await fetchAll('SELECT * FROM Sections');
        const subjects = await fetchAll('SELECT * FROM Subjects');
        const faculty = await fetchAll('SELECT * FROM Faculty WHERE faculty_id < 1000'); 
        const dummyFaculty = await fetchAll('SELECT * FROM Faculty WHERE faculty_id > 1000'); 

        const protectedFacultyIds = [541, 542, 543, 544, 545];
        const protectedSubjects = ['A6HS08', 'A6HS12', 'A6HS15'];

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
                if (['Library', 'Sports', 'Counselling'].includes(subject.subject_name)) {
                    const dummyFac = dummyFaculty.find(f => f.faculty_name === `${subject.subject_name}_${section.section_name}`);
                    if (dummyFac) {
                        mapping[section.section_id][subject.subject_code] = dummyFac.faculty_id;
                    }
                } 
                else if (protectedSubjects.includes(subject.subject_code)) {
                    const rFact = protectedFacultyIds[section.section_id % protectedFacultyIds.length];
                    mapping[section.section_id][subject.subject_code] = rFact;
                    if (facultyWorkload[rFact] === undefined) {
                        facultyWorkload[rFact] = 0;
                        facultySubjectCount[rFact] = {};
                    }
                    facultyWorkload[rFact] += subject.hours_per_week;
                    facultySubjectCount[rFact][subject.subject_code] = (facultySubjectCount[rFact][subject.subject_code] || 0) + 1;
                }
                else {
                    academicAssignments.push({ section, subject });
                }
            }
        }

        const generalFacultyPool = faculty.filter(f => !protectedFacultyIds.includes(f.faculty_id));

        for (let i = academicAssignments.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [academicAssignments[i], academicAssignments[j]] = [academicAssignments[j], academicAssignments[i]];
        }

        for (const { section, subject } of academicAssignments) {
            const subCode = subject.subject_code;
            
            // STRICT MATH: Lowest workload ALWAYS prioritizes first to mathematically force ~14 hr spread!
            generalFacultyPool.sort((a, b) => {
                const loadDiff = facultyWorkload[a.faculty_id] - facultyWorkload[b.faculty_id];
                if (loadDiff !== 0) return loadDiff;
                // If equal workload, fall back to spread
                const countA = facultySubjectCount[a.faculty_id][subCode] || 0;
                const countB = facultySubjectCount[b.faculty_id][subCode] || 0;
                return countA - countB;
            });

            // STRICT CAP AT 18
            let selectedFaculty = null;
            for (const f of generalFacultyPool) {
                if (facultyWorkload[f.faculty_id] + subject.hours_per_week <= 18) {
                    selectedFaculty = f;
                    break;
                }
            }
            if (!selectedFaculty) {
                // If we absolutely cannot find one under 18, just take the absolute lowest loaded one
                selectedFaculty = generalFacultyPool[0];
            }

            mapping[section.section_id][subject.subject_code] = selectedFaculty.faculty_id;
            facultyWorkload[selectedFaculty.faculty_id] += subject.hours_per_week;
            facultySubjectCount[selectedFaculty.faculty_id][subCode] = (facultySubjectCount[selectedFaculty.faculty_id][subCode] || 0) + 1;
        }

        fs.writeFileSync('faculty_mapping.json', JSON.stringify(mapping, null, 2));
        
        const workloads = Object.values(facultyWorkload);
        const maxWorkload = Math.max(...workloads);
        console.log(`Balanced Smart Mapping Generated! Max workload cap strictly at: ${maxWorkload} hours/week.`);
        
        db.close();
    } catch (err) { console.error(err); }
}

smartBalance();
