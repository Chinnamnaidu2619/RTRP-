const express = require('express');
const cors = require('cors');
const uploadRoutes = require('./routes/upload');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for large base64
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const authRoutes = require('./routes/auth').router;
const apiRoutes = require('./routes/api');
const timetableRoutes = require('./routes/timetable');
const attendanceRoutes = require('./routes/attendance');

// Test route
app.get('/api/health', (req, res) => {
    res.json({ status: 'Backend is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
// Public and shared API endpoints
app.use('/api', apiRoutes);

// Protected Routes Management
app.use('/api/timetable', timetableRoutes);
app.use('/api/attendance', attendanceRoutes);

// Echo server for robust file downloads bypassing frontend browser extensions (like IDM)
// Placed BEFORE apiRoutes so it doesn't get blocked by the verifyToken middleware
app.post('/api/download', (req, res) => {
    const { filename, content, type } = req.body;
    if (!filename || !content) return res.status(400).send('Missing parameters');
    
    // Remove the data URI scheme prefix if present
    const base64Data = content.split('base64,').pop();
    const buffer = Buffer.from(base64Data, 'base64');
    
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', type || 'application/octet-stream');
    res.send(buffer);
});

// Public and shared API endpoints

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
