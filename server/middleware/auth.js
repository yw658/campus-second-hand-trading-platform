// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function requireAuth(req, res, next) {
    try {
        const auth = req.headers.authorization || '';
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        if (!token) return res.status(401).json({ message: 'Unauthorized' });

        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(payload._id).lean();
        if (!user) return res.status(401).json({ message: 'Unauthorized' });
        if (user.isBanned) return res.status(403).json({ message: 'Account banned' });

        req.user = {
            _id: user._id,
            email: user.email,
            username: user.username,
            isAdmin: !!user.isAdmin,
            isBanned: !!user.isBanned,
        };
        next();
    } catch (e) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
}

module.exports = { requireAuth };