const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_123';

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
    }

    // Check if it's an admin login (assume email field = username for admin)
    db.get('SELECT * FROM Admins WHERE username = ?', [email], (err, admin) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        if (admin) {
            bcrypt.compare(password, admin.password, (err, isValid) => {
                if (isValid) {
                    const token = jwt.sign({ id: admin.admin_id, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
                    return res.json({ token, role: 'admin', message: 'Logged in as Admin' });
                }
                return res.status(401).json({ error: 'Invalid credentials' });
            });
        } else {
            // Check Faculty
            db.get('SELECT * FROM Faculty WHERE email = ?', [email], (err, faculty) => {
                if (err) return res.status(500).json({ error: 'Database error' });

                if (!faculty) {
                    return res.status(401).json({ error: 'Invalid credentials' });
                }

                bcrypt.compare(password, faculty.password, (err, isValid) => {
                    if (isValid) {
                        const token = jwt.sign({ id: faculty.faculty_id, role: 'faculty' }, JWT_SECRET, { expiresIn: '8h' });
                        return res.json({ token, role: 'faculty', faculty_id: faculty.faculty_id, name: faculty.faculty_name });
                    }
                    return res.status(401).json({ error: 'Invalid credentials' });
                });
            });
        }
    });
});

module.exports = {
    router,
    JWT_SECRET
};
