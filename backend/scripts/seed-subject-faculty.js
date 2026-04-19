/**
 * Seeds SubjectFaculty table from New_Subjects_Data.csv
 * Run once: node scripts/seed-subject-faculty.js
 */
const path = require('path');
const fs = require('fs');
const db = require('../db');

const CSV_PATH = path.join(__dirname, 'New_Subjects_Data.csv');

function parseCsv(content) {
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    return lines.slice(1).map(line => {
        const vals = line.split(',');
        const row = {};
        headers.forEach((h, i) => { row[h] = (vals[i] || '').trim(); });
        return row;
    });
}

// Generate all stripped variants of a DB email local part
function emailVariants(emailLocal) {
    const local = emailLocal.replace(/@.*$/, '').toLowerCase();
    return [
        local,
        local.replace(/^mrs/, ''),       // full Mrs strip → bXXX
        local.replace(/^dr/, ''),        // Dr strip
        local.replace(/^mr/, ''),        // strip mr (leaves 's' for mrs*) → sXXX
        local.replace(/^ms/, ''),        // Ms strip
    ];
}

function resolveFacultyId(emailPrefix, allFaculty) {
    const needle = emailPrefix.replace(/@.*$/, '').toLowerCase();
    if (!needle) return null;

    // Pass 1: exact startsWith on any variant
    for (const f of allFaculty) {
        const vars = emailVariants(f.email.split('@')[0]);
        if (vars.some(v => v.startsWith(needle))) return f.faculty_id;
    }

    // Pass 2: fuzzy — first 7 chars of needle match any variant (handles 1-char divergence at end)
    if (needle.length >= 7) {
        const needleHead = needle.slice(0, 7);
        for (const f of allFaculty) {
            const vars = emailVariants(f.email.split('@')[0]);
            if (vars.some(v => v.startsWith(needleHead))) return f.faculty_id;
        }
    }

    // Pass 3: any variant contains needle as substring
    for (const f of allFaculty) {
        const vars = emailVariants(f.email.split('@')[0]);
        if (vars.some(v => v.includes(needle) || needle.includes(v.slice(2)))) return f.faculty_id;
    }

    return null;
}

setTimeout(() => {
    db.all('SELECT faculty_id, faculty_name, email FROM Faculty', [], (err, faculty) => {
        if (err) { console.error(err); process.exit(1); }

        if (!fs.existsSync(CSV_PATH)) {
            console.error('CSV not found at:', CSV_PATH);
            process.exit(1);
        }

        const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
        console.log(`Processing ${rows.length} rows...`);

        db.run('DELETE FROM SubjectFaculty', () => {
        db.run('BEGIN TRANSACTION', () => {
            // Upsert subjects first (metadata only, no faculty_id)
            const subStmt = db.prepare(
                `INSERT OR IGNORE INTO Subjects (subject_code, year, subject_name, subject_type, hours_per_week)
                 VALUES (?, ?, ?, ?, ?)`
            );
            const sfStmt = db.prepare(
                `INSERT OR IGNORE INTO SubjectFaculty (subject_code, year, faculty_id) VALUES (?, ?, ?)`
            );

            let matched = 0, unmatched = [];

            rows.forEach(row => {
                const code = row.subject_code;
                const year = parseInt(row.year);
                let type = row.subject_type;
                type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
                if (!['Theory', 'Lab', 'Project', 'Skill'].includes(type)) type = 'Theory';

                subStmt.run(code, year, row.subject_name, type, parseInt(row.hours_per_week));

                const fid = resolveFacultyId(row.faculty_email, faculty);
                if (fid) {
                    sfStmt.run(code, year, fid);
                    matched++;
                } else {
                    unmatched.push(`${row.faculty_email} → ${row.subject_code}`);
                }
            });

            subStmt.finalize(() => {
                sfStmt.finalize(() => {
                    db.run('COMMIT', () => {
                        db.all('SELECT COUNT(*) as cnt FROM SubjectFaculty', [], (e, r) => {
                            console.log(`✓ Matched: ${matched}/${rows.length}, DB count: ${r[0].cnt}`);
                            if (unmatched.length) {
                                console.warn('Unmatched emails:');
                                unmatched.forEach(u => console.warn(' ', u));
                            }
                            db.close(() => process.exit(0));
                        });
                    });
                });
            });
        });
        }); // DELETE callback
    });
}, 1200);
