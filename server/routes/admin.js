const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const User = require('../models/User');
const Item = require('../models/Item');
const Report = require('../models/Report');
const { requireAuth } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

/* ===========================
 * Helpers
 * =========================== */
function assertObjectId(id, name = 'id') {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        const err = new Error(`Invalid ${name}`);
        err.status = 400;
        throw err;
    }
}

/* ===========================
 * Lists
 * =========================== */

// Users list
router.get('/users', requireAuth, requireAdmin, async (_req, res) => {
    const users = await User.find()
        .select('_id email username isAdmin isBanned createdAt')
        .sort({ createdAt: -1 });
    res.json(users);
});

// Items list
router.get('/items', requireAuth, requireAdmin, async (_req, res) => {
    const items = await Item.find()
        .populate('sellerId', 'username email')
        .sort({ createdAt: -1 });
    res.json(items);
});

// Reports list
router.get('/reports', requireAuth, requireAdmin, async (req, res) => {
    const { status } = req.query;
    const filter = {};
    if (status && ['pending', 'resolved', 'dismissed'].includes(status)) {
        filter.status = status;
    }
    const reports = await Report.find(filter)
        .populate('itemId', 'title image price isSold isReported isHidden')
        .populate('reporterId', 'username email')
        .sort({ createdAt: -1 });
    res.json(reports);
});

/* ===========================
 * Users: ban / unban
 * =========================== */
router.patch('/users/:id/ban', requireAuth, requireAdmin, async (req, res) => {
    try {
        assertObjectId(req.params.id, 'user id');
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { isBanned: true } },
            { new: true }
        ).select('_id email username isAdmin isBanned');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (e) {
        res.status(e.status || 500).json({ message: e.message || 'Failed to ban user' });
    }
});

router.patch('/users/:id/unban', requireAuth, requireAdmin, async (req, res) => {
    try {
        assertObjectId(req.params.id, 'user id');
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { isBanned: false } },
            { new: true }
        ).select('_id email username isAdmin isBanned');
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (e) {
        res.status(e.status || 500).json({ message: e.message || 'Failed to unban user' });
    }
});

router.patch('/items/:id/hide', requireAuth, requireAdmin, async (req, res) => {
    try {
        assertObjectId(req.params.id, 'item id');
        const item = await Item.findByIdAndUpdate(
            req.params.id,
            { $set: { isHidden: true } },
            { new: true }
        ).populate('sellerId', 'username');
        if (!item) return res.status(404).json({ message: 'Item not found' });
        res.json(item);
    } catch (e) {
        res.status(e.status || 500).json({ message: e.message || 'Failed to hide item' });
    }
});

router.patch('/items/:id/unhide', requireAuth, requireAdmin, async (req, res) => {
    try {
        assertObjectId(req.params.id, 'item id');
        const item = await Item.findByIdAndUpdate(
            req.params.id,
            { $set: { isHidden: false } },
            { new: true }
        ).populate('sellerId', 'username');
        if (!item) return res.status(404).json({ message: 'Item not found' });
        res.json(item);
    } catch (e) {
        res.status(e.status || 500).json({ message: e.message || 'Failed to unhide item' });
    }
});

router.patch('/reports/:id/resolve', requireAuth, requireAdmin, async (req, res) => {
    try {
        assertObjectId(req.params.id, 'report id');
        const report = await Report.findById(req.params.id);
        if (!report) return res.status(404).json({ message: 'Report not found' });

        if (report.itemId) {
            await Item.findByIdAndUpdate(report.itemId, { $set: { isReported: true } });
        }

        report.status = 'resolved';
        report.resolvedAt = new Date();
        await report.save();

        res.json({ message: 'Report resolved. Item flagged as reported.', report });
    } catch (e) {
        res.status(e.status || 500).json({ message: e.message || 'Failed to resolve report' });
    }
});

router.patch('/reports/:id/dismiss', requireAuth, requireAdmin, async (req, res) => {
    try {
        assertObjectId(req.params.id, 'report id');
        const report = await Report.findById(req.params.id);
        if (!report) return res.status(404).json({ message: 'Report not found' });

        report.status = 'dismissed';
        report.resolvedAt = new Date();
        await report.save();

        res.json({ message: 'Report dismissed.', report });
    } catch (e) {
        res.status(e.status || 500).json({ message: e.message || 'Failed to dismiss report' });
    }
});

module.exports = router;