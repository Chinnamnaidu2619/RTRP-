const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../routes/auth');

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(403).json({ error: 'No token provided' });

    // Expecting "Bearer <token>"
    const token = authHeader.split(' ')[1] || authHeader;

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ error: 'Unauthorized!' });
        req.user = decoded;
        next();
    });
};

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Require Admin Role!' });
    }
};

module.exports = { verifyToken, isAdmin };
