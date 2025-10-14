const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Favorite = require('../models/Favorite');

// ---------------------------------------
// Create favorite (idempotent)
// POST /api/favorites
// body: { userId, itemId }
// ---------------------------------------
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

        // idempotent: return existing if already favorited
        const existing = await Favorite.findOne({ userId: uid, itemId: iid });
        if (existing) {
            return res.status(200).json({ message: 'Already favorited', favorite: existing });
        }

        const favorite = await Favorite.create({ userId: uid, itemId: iid });
        return res.status(201).json({ message: 'Item favorited', favorite });
    } catch (err) {
        if (err && err.code === 11000) {
            return res.status(200).json({ message: 'Already favorited' });
        }
        console.error('Create favorite error:', err);
        return res.status(500).json({ message: 'Failed to favorite item' });
    }
});

// ---------------------------------------
// Remove favorite (idempotent)
// DELETE /api/favorites
// body: { userId, itemId }
// Always returns 200 regardless of prior existence
// ---------------------------------------
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

// ---------------------------------------
// Get all favorites for a user (with item populated)
// GET /api/favorites/:userId
// ---------------------------------------
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

// ---------------------------------------
// Check favorite status for a user+item
// GET /api/favorites/status?userId=&itemId=
// returns: { favorited: boolean }
// ---------------------------------------
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