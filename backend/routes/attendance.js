const express = require('express');
const router = express.Router();
const db = require('../db');
const { verifyToken, isAdmin } = require('../middleware/auth');

// GET /api/attendance/absent?date=YYYY-MM-DD
router.get('/absent', verifyToken, (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date required' });
    db.all(
        `SELECT a.absence_id, a.faculty_id, a.absence_date, f.faculty_name, f.department
         FROM Absences a JOIN Faculty f ON a.faculty_id = f.faculty_id
         WHERE a.absence_date = ?`,
        [date],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// POST /api/attendance/absent — mark faculty absent, auto-assign substitutes
router.post('/absent', verifyToken, isAdmin, (req, res) => {
    const { faculty_id, date } = req.body;
    if (!faculty_id || !date) return res.status(400).json({ error: 'faculty_id and date required' });
    db.run(
        'INSERT OR IGNORE INTO Absences (faculty_id, absence_date) VALUES (?, ?)',
        [faculty_id, date],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            generateSubstitutes(faculty_id, date, (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ success: true, message: 'Absence recorded and substitutes assigned.' });
            });
        }
    );
});

// DELETE /api/attendance/absent — mark faculty present, remove substitute assignments
router.delete('/absent', verifyToken, isAdmin, (req, res) => {
    const { faculty_id, date } = req.body;
    if (!faculty_id || !date) return res.status(400).json({ error: 'faculty_id and date required' });
    db.run('DELETE FROM Absences WHERE faculty_id = ? AND absence_date = ?', [faculty_id, date], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        db.run(
            `DELETE FROM SubstituteAssignments WHERE absence_date = ? AND timetable_id IN (
                SELECT id FROM Timetable WHERE faculty_id = ?
            )`,
            [date, faculty_id],
            (err2) => {
                if (err2) return res.status(500).json({ error: err2.message });
                res.json({ success: true });
            }
        );
    });
});

// GET /api/attendance/substitutes?date=YYYY-MM-DD — full substitute timetable for the day
router.get('/substitutes', verifyToken, (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date required' });
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    db.all(
        `SELECT
            t.id AS timetable_id,
            t.day, t.period, t.room_id,
            sec.section_name, sec.year,
            sub.subject_name, sub.subject_type,
            f.faculty_id AS original_faculty_id,
            f.faculty_name AS original_faculty_name,
            sf.faculty_id AS substitute_faculty_id,
            sf.faculty_name AS substitute_faculty_name,
            sa.id AS assignment_id
         FROM Absences a
         JOIN Timetable t ON t.faculty_id = a.faculty_id AND t.day = ?
         JOIN Sections sec ON sec.section_id = t.section_id
         JOIN Subjects sub ON sub.subject_code = t.subject_code
         JOIN Faculty f ON f.faculty_id = t.faculty_id
         LEFT JOIN SubstituteAssignments sa ON sa.timetable_id = t.id AND sa.absence_date = a.absence_date
         LEFT JOIN Faculty sf ON sf.faculty_id = sa.substitute_faculty_id
         WHERE a.absence_date = ?
         ORDER BY t.period, sec.section_name`,
        [dayName, date],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// GET /api/attendance/free-faculty?date=YYYY-MM-DD&period=N
// Returns only faculty with NO class (regular or substitute) at that period on that date
router.get('/free-faculty', verifyToken, (req, res) => {
    const { date, period } = req.query;
    if (!date || !period) return res.status(400).json({ error: 'date and period required' });
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });

    db.all(
        `SELECT f.faculty_id, f.faculty_name, f.department
         FROM Faculty f
         WHERE f.faculty_id NOT IN (
             -- Has a regular class at this slot
             SELECT faculty_id FROM Timetable WHERE day = ? AND period = ?
         )
         AND f.faculty_id NOT IN (
             -- Absent today
             SELECT faculty_id FROM Absences WHERE absence_date = ?
         )
         AND f.faculty_id NOT IN (
             -- Already assigned as substitute at this same period today
             SELECT sa.substitute_faculty_id
             FROM SubstituteAssignments sa
             JOIN Timetable t ON t.id = sa.timetable_id
             WHERE sa.absence_date = ? AND t.day = ? AND t.period = ?
         )
         ORDER BY f.faculty_name`,
        [dayName, period, date, date, dayName, period],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

// PUT /api/attendance/substitutes/:timetableId — manually override a substitute
router.put('/substitutes/:timetableId', verifyToken, isAdmin, (req, res) => {
    const { timetableId } = req.params;
    const { date, substitute_faculty_id } = req.body;
    if (!date || !substitute_faculty_id) return res.status(400).json({ error: 'date and substitute_faculty_id required' });
    db.run(
        `INSERT OR REPLACE INTO SubstituteAssignments (timetable_id, absence_date, substitute_faculty_id)
         VALUES (?, ?, ?)`,
        [timetableId, date, substitute_faculty_id],
        (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// ─── Algorithm ────────────────────────────────────────────────────────────────

// Sequential processing prevents double-booking when 2 classes share the same period
function generateSubstitutes(absentFacultyId, date, callback) {
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    db.all(
        `SELECT t.id, t.period, t.subject_code, sub.year
         FROM Timetable t
         JOIN Subjects sub ON sub.subject_code = t.subject_code
         WHERE t.faculty_id = ? AND t.day = ?`,
        [absentFacultyId, dayName],
        (err, classes) => {
            if (err) return callback(err);
            if (classes.length === 0) return callback(null);
            processNext(classes, 0, absentFacultyId, date, dayName, callback);
        }
    );
}

function processNext(classes, idx, absentFacultyId, date, dayName, callback) {
    if (idx >= classes.length) return callback(null);
    const cls = classes[idx];
    findBestSubstitute(cls, absentFacultyId, date, dayName, (err, substituteId) => {
        if (err) return callback(err);
        if (!substituteId) return processNext(classes, idx + 1, absentFacultyId, date, dayName, callback);
        db.run(
            `INSERT OR REPLACE INTO SubstituteAssignments (timetable_id, absence_date, substitute_faculty_id)
             VALUES (?, ?, ?)`,
            [cls.id, date, substituteId],
            (err2) => {
                if (err2) return callback(err2);
                processNext(classes, idx + 1, absentFacultyId, date, dayName, callback);
            }
        );
    });
}

function findBestSubstitute(cls, absentFacultyId, date, dayName, callback) {
    // Priority 1: faculty who also teach SAME subject (via SubjectFaculty or Timetable), and are free
    db.all(
        `SELECT DISTINCT sf.faculty_id
         FROM SubjectFaculty sf
         WHERE sf.subject_code = ? AND sf.year = ?
           AND sf.faculty_id != ?
           AND sf.faculty_id NOT IN (SELECT faculty_id FROM Absences WHERE absence_date = ?)
         UNION
         SELECT DISTINCT t.faculty_id
         FROM Timetable t
         WHERE t.subject_code = ?
           AND t.faculty_id != ?
           AND t.faculty_id NOT IN (SELECT faculty_id FROM Absences WHERE absence_date = ?)`,
        [cls.subject_code, cls.year, absentFacultyId, date, cls.subject_code, absentFacultyId, date],
        (err, sameSubject) => {
            if (err) return callback(err);
            filterFreeAtPeriod(sameSubject.map(r => r.faculty_id), dayName, cls.period, date, (free1) => {
                if (free1.length > 0) return callback(null, free1[0]);

                // Priority 2: any faculty with fewest total classes who is free at this slot
                db.all(
                    `SELECT f.faculty_id, COUNT(t.id) AS class_count
                     FROM Faculty f
                     LEFT JOIN Timetable t ON t.faculty_id = f.faculty_id
                     WHERE f.faculty_id != ?
                       AND f.faculty_id NOT IN (SELECT faculty_id FROM Absences WHERE absence_date = ?)
                     GROUP BY f.faculty_id
                     ORDER BY class_count ASC`,
                    [absentFacultyId, date],
                    (err2, all) => {
                        if (err2) return callback(err2);
                        filterFreeAtPeriod(all.map(r => r.faculty_id), dayName, cls.period, date, (free2) => {
                            callback(null, free2.length > 0 ? free2[0] : null);
                        });
                    }
                );
            });
        }
    );
}

// Only returns faculty who have NO class (regular or substitute) at this day+period
function filterFreeAtPeriod(facultyIds, day, period, date, callback) {
    if (facultyIds.length === 0) return callback([]);
    const p = facultyIds.map(() => '?').join(',');
    db.all(
        `SELECT faculty_id FROM Timetable
         WHERE day = ? AND period = ? AND faculty_id IN (${p})
         UNION
         SELECT faculty_id FROM Absences
         WHERE absence_date = ? AND faculty_id IN (${p})
         UNION
         SELECT sa.substitute_faculty_id AS faculty_id
         FROM SubstituteAssignments sa
         JOIN Timetable t ON t.id = sa.timetable_id
         WHERE sa.absence_date = ? AND t.day = ? AND t.period = ?
           AND sa.substitute_faculty_id IN (${p})`,
        [day, period, ...facultyIds, date, ...facultyIds, date, day, period, ...facultyIds],
        (err, busy) => {
            if (err) return callback([]);
            const busySet = new Set(busy.map(r => r.faculty_id));
            callback(facultyIds.filter(id => !busySet.has(id)));
        }
    );
}

module.exports = router;
