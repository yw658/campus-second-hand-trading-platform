const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const User = require('../models/User');
const Item = require('../models/Item');

// GET /api/users/:id
// return { _id, username(or name), createdAt, stats: { soldCount, activeCount } }
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid user id' });
        }

        const user = await User.findById(id).lean();
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Count items of this user
        const [soldCount, activeCount] = await Promise.all([
            Item.countDocuments({ sellerId: new mongoose.Types.ObjectId(id), isSold: true }),
            Item.countDocuments({ sellerId: new mongoose.Types.ObjectId(id), isSold: false, isReported: { $ne: true } }),
        ]);

        res.json({
            _id: user._id,
            username: user.username || user.name || '',   // Support both naming styles
            createdAt: user.createdAt,                    // Used by frontend to calculate "how long since registered"
            stats: { soldCount, activeCount },
        });
    } catch (err) {
        console.error('Fetch user error:', err.message);
        res.status(500).json({ message: 'Failed to fetch user' });
    }
});

module.exports = router;