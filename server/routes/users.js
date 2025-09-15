// backend/routes/users.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const User = require('../models/User');
const Item = require('../models/Item'); // 用于统计 sold/active

// GET /api/users/:id
// 返回 { _id, username(或name), createdAt, stats: { soldCount, activeCount } }
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid user id' });
        }

        const user = await User.findById(id).lean();
        if (!user) return res.status(404).json({ message: 'User not found' });

        // 统计该用户（卖家）的商品
        const [soldCount, activeCount] = await Promise.all([
            Item.countDocuments({ sellerId: new mongoose.Types.ObjectId(id), isSold: true }),
            Item.countDocuments({ sellerId: new mongoose.Types.ObjectId(id), isSold: false, isReported: { $ne: true } }),
        ]);

        res.json({
            _id: user._id,
            username: user.username || user.name || '',   // 兼容两种命名
            createdAt: user.createdAt,                    // 用于前端计算“注册多久”
            stats: { soldCount, activeCount },
        });
    } catch (err) {
        console.error('Fetch user error:', err.message);
        res.status(500).json({ message: 'Failed to fetch user' });
    }
});

module.exports = router;