// backend/routes/favorites.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Favorite = require('../models/Favorite');

/**
 * 添加收藏（幂等）
 * POST /api/favorites  body: { userId, itemId }
 * 若已存在，返回 200，不报错
 */
router.post('/', async (req, res) => {
    try {
        const { userId, itemId } = req.body || {};
        if (!userId || !itemId) {
            return res.status(400).json({ message: 'userId and itemId are required' });
        }
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(itemId)) {
            return res.status(400).json({ message: 'Invalid userId or itemId' });
        }

        const uid = new mongoose.Types.ObjectId(userId);
        const iid = new mongoose.Types.ObjectId(itemId);

        // 幂等：先查是否存在
        const existing = await Favorite.findOne({ userId: uid, itemId: iid });
        if (existing) {
            return res.status(200).json({ message: 'Already favorited', favorite: existing });
        }

        const favorite = await Favorite.create({ userId: uid, itemId: iid });
        return res.status(201).json({ message: 'Item favorited', favorite });
    } catch (err) {
        // 若使用了唯一索引，第二次插入可能触发 11000，把它当作成功
        if (err && err.code === 11000) {
            return res.status(200).json({ message: 'Already favorited' });
        }
        console.error('Create favorite error:', err);
        return res.status(500).json({ message: 'Failed to favorite item' });
    }
});

/**
 * 取消收藏（幂等）
 * DELETE /api/favorites  body: { userId, itemId }
 * 不管是否存在记录，都返回 200
 */
router.delete('/', async (req, res) => {
    try {
        const { userId, itemId } = req.body || {};
        if (!userId || !itemId) {
            return res.status(400).json({ message: 'userId and itemId are required' });
        }
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(itemId)) {
            return res.status(400).json({ message: 'Invalid userId or itemId' });
        }

        const uid = new mongoose.Types.ObjectId(userId);
        const iid = new mongoose.Types.ObjectId(itemId);

        await Favorite.deleteOne({ userId: uid, itemId: iid });
        return res.json({ message: 'Item unfavorited' });
    } catch (err) {
        console.error('Delete favorite error:', err);
        return res.status(500).json({ message: 'Failed to delete favorite' });
    }
});

/**
 * 获取某用户所有收藏（带 item 详情）
 * GET /api/favorites/:userId
 */
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid userId' });
        }
        const favorites = await Favorite.find({ userId: new mongoose.Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .populate('itemId');
        return res.json(favorites);
    } catch (err) {
        console.error('Fetch favorites error:', err);
        return res.status(500).json({ message: 'Failed to fetch favorites' });
    }
});

/**
 * 收藏状态查询（详情页按钮用）
 * GET /api/favorites/status?userId=&itemId=
 * 返回 { favorited: boolean }
 */
router.get('/status', async (req, res) => {
    try {
        const { userId, itemId } = req.query || {};
        if (!userId || !itemId) return res.json({ favorited: false });
        if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(itemId)) {
            return res.json({ favorited: false });
        }
        const fav = await Favorite.findOne({
            userId: new mongoose.Types.ObjectId(userId),
            itemId: new mongoose.Types.ObjectId(itemId),
        });
        return res.json({ favorited: !!fav });
    } catch (err) {
        console.error('Favorite status error:', err);
        return res.json({ favorited: false });
    }
});

module.exports = router;