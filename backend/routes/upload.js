const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const db = require('../db');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Schema definitions for column validation
const schemas = {
    faculty: ['faculty_name', 'department', 'email'],
    subject: ['subject_code', 'subject_name', 'subject_type', 'hours_per_week', 'faculty_email', 'year'],
    room: ['room_id', 'room_type', 'capacity'],
    section: ['section_name', 'year']
};

/**
 * Endpoint to upload Excel and get a preview
 * POST /api/upload/preview/:type
 */
router.post('/preview/:type', upload.single('file'), (req, res) => {
    try {
        const { type } = req.params;
        console.log(`Preview request for type: ${type}`);
        if (!schemas[type]) {
            console.log(`Invalid type: ${type}`);
            return res.status(400).json({ error: 'Invalid upload type' });
        }

        if (!req.file) {
            console.log('No file uploaded');
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log(`File uploaded: ${req.file.path}`);
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        console.log(`Sheet name: ${sheetName}`);
        const sheet = workbook.Sheets[sheetName];
        let data = xlsx.utils.sheet_to_json(sheet);
        console.log(`Parsed ${data.length} rows`);

        // Validate structure
        const requiredFields = schemas[type];
        if (data.length > 0) {
            const keys = Object.keys(data[0]).map(k => k.toLowerCase().trim());
            console.log(`Columns found (lowercased): ${keys.join(', ')}`);
            const requiredLower = requiredFields.map(f => f.toLowerCase());
            const missingFields = requiredLower.filter(field => !keys.includes(field));
            if (missingFields.length > 0) {
                console.log(`Missing fields: ${missingFields.join(', ')}`);
                return res.status(400).json({ 
                    error: `Missing required columns: ${missingFields.join(', ')}. Found columns: ${keys.join(', ')}` 
                });
            }
            // Normalize the data keys to match schema
            data = data.map(row => {
                const normalized = {};
                Object.keys(row).forEach(key => {
                    normalized[key.toLowerCase().trim()] = row[key];
                });
                return normalized;
            });
        }

        fs.unlinkSync(req.file.path); // Clean up the temp file

        // Return preview data
        res.json({
            message: 'File parsed successfully',
            count: data.length,
            preview: data.slice(0, 5), // Preview first 5 rows
            data: data // Full data to be sent back for import
        });
    } catch (error) {
        console.error('Error in preview:', error);
        res.status(500).json({ error: 'Error processing file', details: error.message });
    }
});

/**
 * Endpoint to import validated data into the database
 * POST /api/upload/import/:type
 */
router.post('/import/:type', (req, res) => {
    const { type } = req.params;
    const { data } = req.body;
    console.log(`Import request for type: ${type}, data length: ${data ? data.length : 'undefined'}`);

    if (!schemas[type] || !Array.isArray(data)) {
        console.log('Invalid request data');
        return res.status(400).json({ error: 'Invalid request data' });
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        try {
            if (type === 'faculty') {
                const bcrypt = require('bcrypt');
                const defaultPasswordHash = bcrypt.hashSync('password123', 10);

                const stmt = db.prepare('INSERT OR IGNORE INTO Faculty (faculty_name, department, email, password) VALUES (?, ?, ?, ?)');
                data.forEach(row => {
                    console.log(`Inserting faculty: ${row.faculty_name}, ${row.email}`);
                    stmt.run(row.faculty_name.trim(), row.department.trim(), row.email.trim().toLowerCase(), defaultPasswordHash);
                });
                stmt.finalize();
            } else if (type === 'subject') {
                // Resolve faculty email prefix → faculty_id
                // DB emails: dr/mr/mrs/ms + name@domain  — CSV has the name part (possibly truncated)
                const resolveFacultyId = (emailPrefix, callback) => {
                    const prefix = emailPrefix.trim().toLowerCase().replace(/@.*$/, '');
                    db.get(
                        `SELECT faculty_id FROM Faculty
                         WHERE LOWER(REPLACE(REPLACE(REPLACE(REPLACE(email, 'mrs', ''), 'dr', ''), 'mr', ''), 'ms', ''))
                               LIKE ? || '%'
                         ORDER BY LENGTH(email) ASC LIMIT 1`,
                        [prefix],
                        (err, row) => callback(err, row ? row.faculty_id : null)
                    );
                };

                const subjectStmt = db.prepare(`
                    INSERT OR IGNORE INTO Subjects (subject_code, year, subject_name, subject_type, hours_per_week)
                    VALUES (?, ?, ?, ?, ?)
                `);
                const sfStmt = db.prepare(`
                    INSERT OR IGNORE INTO SubjectFaculty (subject_code, year, faculty_id) VALUES (?, ?, ?)
                `);

                let pending = data.length;
                const done = () => { if (--pending === 0) { subjectStmt.finalize(); sfStmt.finalize(); } };

                data.forEach(row => {
                    let subjectType = row.subject_type.trim();
                    const validTypes = ['Theory', 'Lab', 'Project', 'Skill'];
                    subjectType = subjectType.charAt(0).toUpperCase() + subjectType.slice(1).toLowerCase();
                    if (!validTypes.includes(subjectType)) subjectType = 'Theory';

                    const code = row.subject_code.trim();
                    const year = parseInt(row.year);
                    subjectStmt.run(code, year, row.subject_name.trim(), subjectType, parseInt(row.hours_per_week));

                    resolveFacultyId(row.faculty_email || '', (err, facultyId) => {
                        if (!err && facultyId) {
                            sfStmt.run(code, year, facultyId);
                            console.log(`SubjectFaculty: ${code}(yr${year}) → faculty_id ${facultyId}`);
                        } else {
                            console.warn(`No faculty match for: ${row.faculty_email}`);
                        }
                        done();
                    });
                });
            } else if (type === 'room') {
                // Here we might not have a unique identifier, so maybe prevent exact duplicates if needed. 
                // For simplicity, we just insert. To prevent strict duplicates we can check if it exists.
                const stmt = db.prepare('INSERT OR REPLACE INTO Rooms (room_id, room_type, capacity) VALUES (?, ?, ?)');
                data.forEach(row => {
                    let roomType = row.room_type.trim();
                    roomType = roomType.charAt(0).toUpperCase() + roomType.slice(1).toLowerCase();
                    if (!['Classroom', 'Lab'].includes(roomType)) roomType = 'Classroom';

                    console.log(`Inserting room: ${row.room_id}, type: ${roomType}, capacity: ${row.capacity}`);
                    stmt.run(row.room_id.trim(), roomType, parseInt(row.capacity));
                });
                stmt.finalize();
            } else if (type === 'section') {
                const stmt = db.prepare('INSERT INTO Sections (section_name, year) SELECT ?, ? WHERE NOT EXISTS(SELECT 1 FROM Sections WHERE section_name = ? AND year = ?)');
                data.forEach(row => {
                    console.log(`Inserting section: ${row.section_name}, ${row.year}`);
                    stmt.run(row.section_name.trim(), parseInt(row.year), row.section_name.trim(), parseInt(row.year));
                });
                stmt.finalize();
            }

            db.run('COMMIT', (err) => {
                if (err) {
                    console.error('Commit error:', err);
                    throw err;
                }
                console.log(`${type} import successful`);
                res.json({ message: `${type} data imported successfully` });
            });
        } catch (error) {
            console.error('Import error:', error);
            db.run('ROLLBACK');
            res.status(500).json({ error: 'Database import failed', details: error.message });
        }
    });
});

module.exports = router;
