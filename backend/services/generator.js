const db = require('../db');
const fs = require('fs');
const path = require('path');

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FREE_PERIOD_SUBJECTS = new Set(['Library', 'Sports', 'Counselling']);
// Valid adjacent pairs for 2-hour lab blocks (no crossing lunch 3→4)
const LAB_BLOCKS = [[1, 2], [2, 3], [4, 5], [5, 6]];
const THEORY_PERIODS = [1, 2, 3, 4, 5, 6];
const TOTAL_SLOTS_PER_SECTION = 36; // 6 days × 6 periods — must be fully filled

const fetchAll = (query, params = []) => new Promise((resolve, reject) =>
    db.all(query, params, (err, rows) => err ? reject(err) : resolve(rows))
);

function getDedicatedRoomId(sectionName, year) {
    const letter = sectionName.split('-').pop();
    const charCode = letter.charCodeAt(0) - 65 + 1;
    const floor = year === 2 ? '1' : year === 3 ? '2' : '3';
    return `MG ${floor}0${charCode}`;
}

// Fast Fisher-Yates shuffle (in-place, returns array)
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
}

// Encode day+period into a single integer key for O(1) lookup
// day 0-5, period 1-6 → key = day*10 + period
function key(dayIdx, period) { return dayIdx * 10 + period; }

const generateTimetable = async () => {
    const [sections, rooms, allSubjects, allFaculty] = await Promise.all([
        fetchAll('SELECT * FROM Sections'),
        fetchAll('SELECT * FROM Rooms'),
        fetchAll('SELECT * FROM Subjects'),
        fetchAll('SELECT faculty_id FROM Faculty'),
    ]);

    let facultyMapping = {};
    try {
        facultyMapping = JSON.parse(fs.readFileSync(path.join(__dirname, '../faculty_mapping.json'), 'utf8'));
    } catch (e) { throw new Error('faculty_mapping.json missing'); }

    const facultyPool = allFaculty.map(f => f.faculty_id);
    let rrIdx = 0;
    const nextFaculty = () => facultyPool[rrIdx++ % facultyPool.length];

    // Pre-index subjects by year
    const subjectsByYear = {};
    for (const s of allSubjects) {
        (subjectsByYear[s.year] = subjectsByYear[s.year] || []).push(s);
    }

    // Pre-index lab rooms — shuffle so all rooms get used evenly
    const labRooms = shuffle(rooms.filter(r => r.room_type === 'Lab').map(r => r.room_id));

    // Only schedule sections that have explicit faculty mappings — skip unmapped duplicates
    const mappedSectionIds = new Set(Object.keys(facultyMapping).map(Number));
    const schedulableSections = sections.filter(s => mappedSectionIds.has(s.section_id));

    // Build assignment list once (outside retry loop)
    // Free period subjects are NEVER scheduled — all 36 slots must be filled with real subjects
    const baseAssignments = [];
    for (const section of schedulableSections) {
        const subs = subjectsByYear[section.year] || [];
        for (const subject of subs) {
            const fId = facultyMapping[section.section_id]?.[subject.subject_code];
            // Skip subjects with no faculty mapping
            if (!fId) continue;
            // Skip free period subjects entirely — no free classes allowed
            if (FREE_PERIOD_SUBJECTS.has(subject.subject_name)) continue;
            const isLab = subject.subject_type === 'Lab';
            const isProject = subject.subject_type === 'Project' || subject.subject_type === 'Skill';
            const priority = isLab ? 1 : isProject ? 2 : 3;
            baseAssignments.push({ section, subject, fId, priority, hours: subject.hours_per_week });
        }
    }

    // Sort once by priority (stable within groups)
    // Then interleave sections so shared faculty get distributed evenly
    baseAssignments.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        // Within same priority, interleave by section to avoid monopolizing shared faculty
        return a.section.section_id - b.section.section_id;
    });

    const MAX_ATTEMPTS = 5000;
    const RELAX_THRESHOLD = 4500;
    let lastError = '';

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const strictMode = attempt <= RELAX_THRESHOLD;
        const result = tryScheduleInMemory(baseAssignments, labRooms, sections, strictMode);
        if (result.success) {
            console.log(`Timetable generated on attempt ${attempt} (Strict Mode: ${strictMode})`);
            await commitToDatabase(result.entries);
            await assignVivaFaculty();
            return { message: 'Timetable generated successfully', scheduled_classes: result.entries.length };
        }
        lastError = result.error;
    }

    throw new Error(`Failed after ${MAX_ATTEMPTS} attempts. Last: ${lastError}`);
};

/**
 * Pure in-memory scheduling — no DB calls at all.
 * Returns { success, entries, error }
 */
function tryScheduleInMemory(baseAssignments, labRooms, sections, strictMode) {
    // Bit-set style: Set<string> keys "fId:dayIdx:period", "roomId:dayIdx:period", "sId:dayIdx:period"
    const facultyBusy  = new Set();
    const roomBusy     = new Set();
    const sectionBusy  = new Set();
    const subjectOnDay = new Set(); // "sId:dayIdx:subjectCode"

    const entries = []; // { sId, subjectCode, fId, roomId, day, period }

    function fKey(fId, d, p)   { return `f${fId}_${d}_${p}`; }
    function rKey(rId, d, p)   { return `r${rId}_${d}_${p}`; }
    function sKey(sId, d, p)   { return `s${sId}_${d}_${p}`; }
    function sdKey(sId, d, c)  { return `sd${sId}_${d}_${c}`; }

    function wouldExceedMaxConsecutive(fId, d, periodsToPlace) {
        const morning = [1, 2, 3];
        const afternoon = [4, 5, 6];
        
        let mCount = 0;
        let aCount = 0;
        
        for (const p of morning) {
            if (facultyBusy.has(fKey(fId, d, p)) || periodsToPlace.includes(p)) mCount++;
        }
        for (const p of afternoon) {
            if (facultyBusy.has(fKey(fId, d, p)) || periodsToPlace.includes(p)) aCount++;
        }
        
        return mCount === 3 || aCount === 3;
    }

    function isFree(fId, rId, sId, d, p) {
        if (strictMode && wouldExceedMaxConsecutive(fId, d, [p])) return false;
        return !facultyBusy.has(fKey(fId, d, p)) &&
               !sectionBusy.has(sKey(sId, d, p));
        // Note: classroom room conflict not checked — each section has its own dedicated room
    }

    function mark(fId, rId, sId, d, p, subCode) {
        facultyBusy.add(fKey(fId, d, p));
        roomBusy.add(rKey(rId, d, p)); // still track for lab room conflicts
        sectionBusy.add(sKey(sId, d, p));
        subjectOnDay.add(sdKey(sId, d, subCode));
        entries.push({ sId, subjectCode: subCode, fId, roomId: rId, dayIdx: d, period: p });
    }

    let labRoomIdx = 0; // round-robin index for lab room assignment

    function findFreeLabRoom(d, p1, p2) {
        for (let i = 0; i < labRooms.length; i++) {
            const rId = labRooms[(labRoomIdx + i) % labRooms.length];
            if (!roomBusy.has(rKey(rId, d, p1)) && !roomBusy.has(rKey(rId, d, p2))) {
                labRoomIdx = (labRoomIdx + i + 1) % labRooms.length;
                return rId;
            }
        }
        return null;
    }

    function findFreeLabRoomSingle(d, p) {
        for (let i = 0; i < labRooms.length; i++) {
            const rId = labRooms[(labRoomIdx + i) % labRooms.length];
            if (!roomBusy.has(rKey(rId, d, p))) {
                labRoomIdx = (labRoomIdx + i + 1) % labRooms.length;
                return rId;
            }
        }
        return null;
    }

    // Shuffle day indices once per attempt (reuse across items for speed)
    const dayOrder = shuffle([0, 1, 2, 3, 4, 5]);
    const blockOrder = shuffle([...LAB_BLOCKS]);
    const periodOrder = shuffle([...THEORY_PERIODS]);

    for (const base of baseAssignments) {
        const { section, subject, fId, priority } = base;
        const sId = section.section_id;
        const subCode = subject.subject_code;
        const roomId = getDedicatedRoomId(section.section_name, section.year);
        let hoursLeft = base.hours;

        // ── LAB (priority 1): strict 2-hour consecutive block per week (one block only)
        // hours_per_week=2 → schedule exactly ONE 2hr block
        // hours_per_week=3 → schedule exactly ONE 2hr block; ignore the extra hour
        // hours_per_week=6 → schedule THREE 2hr blocks on different days
        if (priority === 1) {
            // Number of 2hr blocks to place = floor(hoursLeft / 2), min 1
            const blocksToPlace = Math.max(1, Math.floor(hoursLeft / 2));
            let blocksPlaced = 0;

            while (blocksPlaced < blocksToPlace) {
                let placed = false;
                outer: for (const d of shuffle([...dayOrder])) {
                    // Allow same subject on multiple days for multi-block labs (Major Project)
                    // But not same day twice
                    if (subjectOnDay.has(sdKey(sId, d, subCode))) continue;
                    for (const [p1, p2] of shuffle([...blockOrder])) {
                        if (sectionBusy.has(sKey(sId, d, p1)) || sectionBusy.has(sKey(sId, d, p2))) continue;
                        if (facultyBusy.has(fKey(fId, d, p1)) || facultyBusy.has(fKey(fId, d, p2))) continue;
                        if (strictMode && wouldExceedMaxConsecutive(fId, d, [p1, p2])) continue;
                        const lRoom = findFreeLabRoom(d, p1, p2);
                        if (!lRoom) continue;
                        facultyBusy.add(fKey(fId, d, p1)); facultyBusy.add(fKey(fId, d, p2));
                        roomBusy.add(rKey(lRoom, d, p1));  roomBusy.add(rKey(lRoom, d, p2));
                        sectionBusy.add(sKey(sId, d, p1)); sectionBusy.add(sKey(sId, d, p2));
                        subjectOnDay.add(sdKey(sId, d, subCode));
                        entries.push({ sId, subjectCode: subCode, fId, roomId: lRoom, dayIdx: d, period: p1 });
                        entries.push({ sId, subjectCode: subCode, fId, roomId: lRoom, dayIdx: d, period: p2 });
                        blocksPlaced++;
                        placed = true;
                        break outer;
                    }
                }
                if (!placed) return { success: false, error: `Lab 2hr block failed: ${subject.subject_name} / ${section.section_name}` };
            }
            continue;
        }

        // ── PROJECT/SPECIAL (priority 2): try 2-hour block, then singles across all 6 periods
        if (priority === 2) {
            if (hoursLeft >= 2) {
                for (const d of shuffle([...dayOrder])) {
                    if (hoursLeft < 2) break;
                    if (subjectOnDay.has(sdKey(sId, d, subCode))) continue;
                    for (const [p1, p2] of shuffle([...blockOrder])) {
                        if (!isFree(fId, roomId, sId, d, p1) || !isFree(fId, roomId, sId, d, p2)) continue;
                        if (strictMode && wouldExceedMaxConsecutive(fId, d, [p1, p2])) continue;
                        mark(fId, roomId, sId, d, p1, subCode);
                        mark(fId, roomId, sId, d, p2, subCode);
                        hoursLeft -= 2;
                        break;
                    }
                }
            }
            while (hoursLeft > 0) {
                let placed = false;
                outer: for (const d of shuffle([...dayOrder])) {
                    for (const p of shuffle([...THEORY_PERIODS])) {
                        if (!isFree(fId, roomId, sId, d, p)) continue;
                        mark(fId, roomId, sId, d, p, subCode);
                        hoursLeft--;
                        placed = true;
                        break outer;
                    }
                }
                if (!placed) {
                    if (!strictMode) break; // Drop remaining conflict hours softly to preserve the other 600 assignments
                    return { success: false, error: `Project unscheduled: ${subject.subject_name} / ${section.section_name}` };
                }
            }
            continue;
        }

        // ── THEORY (priority 3): use all 6 periods freely — no free classes, all slots must be filled
        while (hoursLeft > 0) {
            let placed = false;
            outer: for (const d of shuffle([...dayOrder])) {
                for (const p of shuffle([...THEORY_PERIODS])) {
                    if (!isFree(fId, roomId, sId, d, p)) continue;
                    mark(fId, roomId, sId, d, p, subCode);
                    hoursLeft--;
                    placed = true;
                    break outer;
                }
            }
            if (!placed) {
                if (!strictMode) break; // Drop remaining conflict hours softly instead of crashing completely
                return { success: false, error: `Theory unscheduled: ${subject.subject_name} / ${section.section_name}` };
            }
        }
    }

    // All subjects scheduled successfully
    return { success: true, entries };
}

/**
 * Write the result to DB in a single transaction — called only once on success.
 */
function commitToDatabase(entries) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            db.run('DELETE FROM Timetable');
            db.run('DELETE FROM TimeSlots');

            const insertSlot = db.prepare('INSERT INTO TimeSlots (day, period, start_time, end_time) VALUES (?, ?, ?, ?)');
            const slotTimes = [
                [1, '09:20', '10:20'], [2, '10:20', '11:20'], [3, '11:20', '12:20'],
                [4, '13:10', '14:10'], [5, '14:10', '15:10'], [6, '15:10', '16:10'],
            ];
            for (const day of DAYS)
                for (const [p, s, e] of slotTimes)
                    insertSlot.run(day, p, s, e);
            insertSlot.finalize();

            const insertTT = db.prepare(
                'INSERT INTO Timetable (section_id, subject_code, faculty_id, room_id, day, period) VALUES (?, ?, ?, ?, ?, ?)'
            );
            for (const e of entries)
                insertTT.run(e.sId, e.subjectCode, e.fId, e.roomId, DAYS[e.dayIdx], e.period);
            insertTT.finalize();

            db.run('COMMIT', err => {
                if (err) { db.run('ROLLBACK'); return reject(err); }
                resolve();
            });
        });
    });
}

module.exports = { generateTimetable };

async function assignVivaFaculty() {
    const labSlots = await fetchAll(`
        SELECT t.id, t.section_id, t.faculty_id, t.day, t.period, t.subject_code, s.year
        FROM Timetable t
        JOIN Sections s ON t.section_id = s.section_id
        JOIN Subjects sub ON sub.subject_code = t.subject_code AND sub.year = s.year
        WHERE sub.subject_type = 'Lab'
        ORDER BY t.section_id, t.subject_code, t.day, t.period
    `);

    const allFaculty = await fetchAll(`SELECT faculty_id FROM Faculty`);
    const allFacultyIds = allFaculty.map(f => f.faculty_id);

    const allSlots = await fetchAll(`SELECT faculty_id, day, period FROM Timetable`);
    const busyMap = new Set();
    for (const s of allSlots) busyMap.add(`${s.faculty_id}_${s.day}_${s.period}`);

    const blocks = {};
    for (const slot of labSlots) {
        const key = `${slot.section_id}_${slot.subject_code}_${slot.day}`;
        if (!blocks[key]) blocks[key] = [];
        blocks[key].push(slot);
    }

    const vivaLoad = {};
    for (const [, slots] of Object.entries(blocks)) {
        slots.sort((a, b) => a.period - b.period);
        const mainFId = slots[0].faculty_id;
        const available = allFacultyIds.filter(fId => {
            if (fId === mainFId) return false;
            return slots.every(s => !busyMap.has(`${fId}_${s.day}_${s.period}`));
        });
        if (!available.length) continue;
        available.sort((a, b) => (vivaLoad[a] || 0) - (vivaLoad[b] || 0));
        const vivaFId = available[0];
        for (const slot of slots) {
            await new Promise((res, rej) => db.run(
                `UPDATE Timetable SET viva_faculty_id = ? WHERE id = ?`,
                [vivaFId, slot.id],
                e => e ? rej(e) : res()
            ));
        }
        vivaLoad[vivaFId] = (vivaLoad[vivaFId] || 0) + slots.length;
    }
    console.log(`Viva faculty assigned to ${labSlots.length} lab slots`);
}
