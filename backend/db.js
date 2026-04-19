const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database', 'timetable.db');
const schemaPath = path.join(__dirname, 'database', 'schema.sql');

// Ensure database directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('CRITICAL: Error opening database', err.message);
    } else {
        console.log('SUCCESS: Connected to the SQLite database.');
        // Initialize schema
        if (fs.existsSync(schemaPath)) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            db.exec(schema, (err) => {
                if (err) {
                    console.error('ERROR during schema execution:', err.message);
                } else {
                    console.log('SUCCESS: Database schema initialized.');
                    
                    // Create default admin if not exists
                    db.get('SELECT * FROM Admins WHERE username = ?', ['admin'], (err, row) => {
                        if (err) {
                            console.error('ERROR checking admin existence:', err.message);
                        } else if (!row) {
                            const bcrypt = require('bcrypt');
                            const saltRounds = 10;
                            bcrypt.hash('admin123', saltRounds, (err, hash) => {
                                if (err) {
                                    console.error('ERROR hashing default password:', err.message);
                                } else {
                                    db.run('INSERT INTO Admins (username, password) VALUES (?, ?)', ['admin', hash], (err) => {
                                        if (err) console.error('ERROR creating default admin:', err.message);
                                        else console.log('SUCCESS: Default admin created (username: admin, password: admin123)');
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
    }
});

module.exports = db;
