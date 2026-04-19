const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const db = new sqlite3.Database('./database/timetable.db');

const fetchAll = (query) => new Promise((resolve, reject) => {
    db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
    });
});

async function allocateRemaining() {
    try {
        const subjects = await fetchAll('SELECT * FROM Subjects');
        const faculty = await fetchAll('SELECT * FROM Faculty WHERE faculty_id < 1000'); // Valid faculties

        const mappingPath = './faculty_mapping.json';
        const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

        const facultyWorkload = {};
        const facultySubjectCount = {};
        
        faculty.forEach(f => {
            facultyWorkload[f.faculty_id] = 0;
            facultySubjectCount[f.faculty_id] = {};
        });

        const subjectIndex = {};
        subjects.forEach(s => subjectIndex[s.subject_code] = s);

        // Step 1: Calculate current workloads
        for (const [sectionId, subMap] of Object.entries(mapping)) {
            for (const [subCode, fId] of Object.entries(subMap)) {
                if (fId > 0 && facultyWorkload[fId] !== undefined) {
                    const hours = subjectIndex[subCode] ? subjectIndex[subCode].hours_per_week : 0;
                    facultyWorkload[fId] += hours;
                    facultySubjectCount[fId][subCode] = (facultySubjectCount[fId][subCode] || 0) + 1;
                }
            }
        }

        // Step 2: Find unassigned (fId === 0) and allocate
        let assignedCount = 0;
        let dbUpdates = [];

        for (const [sectionId, subMap] of Object.entries(mapping)) {
            for (const [subCode, fId] of Object.entries(subMap)) {
                if (fId === 0) {
                    // It means it's unassigned
                    const subjectInfo = subjectIndex[subCode];
                    if (!subjectInfo) continue;

                    // Sort faculty by workload to find the least loaded one
                    faculty.sort((a, b) => {
                        const countA = facultySubjectCount[a.faculty_id][subCode] || 0;
                        const countB = facultySubjectCount[b.faculty_id][subCode] || 0;
                        // Avoid overloading one faculty with the same subject across too many sections if possible
                        if (countA !== countB) return countA - countB; 
                        return facultyWorkload[a.faculty_id] - facultyWorkload[b.faculty_id];
                    });

                    const selected = faculty[0];
                    mapping[sectionId][subCode] = selected.faculty_id;
                    facultyWorkload[selected.faculty_id] += subjectInfo.hours_per_week;
                    facultySubjectCount[selected.faculty_id][subCode] = (facultySubjectCount[selected.faculty_id][subCode] || 0) + 1;
                    
                    assignedCount++;

                    // Also prepare to update the timetable table if it had a 0
                    dbUpdates.push({
                        newFid: selected.faculty_id,
                        sectionId: sectionId,
                        subCode: subCode
                    });
                }
            }
        }

        if (assignedCount > 0) {
            fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2), 'utf8');
            console.log(`Re-allocated ${assignedCount} unassigned subjects across faculty based on workload.`);
            
            // Update timetable
            let updatedDbRows = 0;
            const updateStmt = db.prepare('UPDATE Timetable SET faculty_id = ? WHERE section_id = ? AND subject_code = ? AND faculty_id = 0');
            for (const req of dbUpdates) {
                await new Promise((res, rej) => {
                    updateStmt.run(req.newFid, req.sectionId, req.subCode, function(err) {
                        if (err) rej(err);
                        updatedDbRows += this.changes;
                        res();
                    });
                });
            }
            updateStmt.finalize();
            console.log(`Updated ${updatedDbRows} rows directly in the timetable database.`);
        } else {
            console.log("No unassigned subjects found to re-allocate.");
        }

        db.close();
    } catch (e) {
        console.error(e);
    }
}

allocateRemaining();
