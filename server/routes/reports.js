const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Report = require('../models/Report');
const Item = require('../models/Item');
const { requireAuth } = require('../middleware/auth');

/**
 * Create a report (authed user)
 * POST /api/reports
 * body: { itemId, reason }
 * NOTE: Do NOT change item status here; only record a pending report.
 */
router.post('/', requireAuth, async (req, res) => {
    try {
        const { itemId, reason } = req.body;
        if (!itemId || !reason) return res.status(400).json({ message: 'itemId and reason are required' });
        if (!mongoose.Types.ObjectId.isValid(itemId)) return res.status(400).json({ message: 'Invalid itemId' });

        const item = await Item.findById(itemId).select('_id sellerId');
        if (!item) return res.status(404).json({ message: 'Item not found' });

        if (String(item.sellerId) === String(req.user._id)) {
            return res.status(400).json({ message: 'You cannot report your own item' });
        }

        // avoid duplicate pending report by same user on same item
        const dup = await Report.findOne({ itemId, reporterId: req.user._id, status: 'pending' });
        if (dup) return res.status(409).json({ message: 'You already reported this item and it is pending review.' });

        const report = await Report.create({
            itemId,
            reporterId: req.user._id,
            reason: String(reason).trim(),
            status: 'pending',
        });

        res.status(201).json(report);
    } catch (e) {
        console.error('[Reports] create error:', e);
        res.status(500).json({ message: 'Failed to create report' });
    }
});

/**
 * List reports (admin only)
 * GET /api/reports?status=pending|resolved|dismissed (optional)
 */
router.get('/', requireAuth, async (req, res) => {
    try {
        if (!req.user.isAdmin) return res.status(403).json({ message: 'Forbidden' });

        const { status } = req.query;
        const filter = {};
        if (status && ['pending', 'resolved', 'dismissed'].includes(status)) filter.status = status;

        const rows = await Report.find(filter)
            .sort({ createdAt: -1 })
            .populate('itemId', 'title image price isSold isReported isHidden')
            .populate('reporterId', 'username email')
            .lean();

        res.json(rows);
    } catch (e) {
        console.error('[Reports] list error:', e);
        res.status(500).json({ message: 'Failed to fetch reports' });
    }
});

/**
 * Admin action on a report
 * PATCH /api/reports/:id
 * body: { action: 'resolve' | 'dismiss' }
 * - resolve: mark report resolved + flag item.isReported=true
 * - dismiss: mark report dismissed
 */
router.patch('/:id', requireAuth, async (req, res) => {
    try {
        if (!req.user.isAdmin) return res.status(403).json({ message: 'Forbidden' });

        const { id } = req.params;
        const { action } = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });
        if (!['resolve', 'dismiss'].includes(action)) return res.status(400).json({ message: 'Invalid action' });

        const report = await Report.findById(id);
        if (!report) return res.status(404).json({ message: 'Report not found' });

        if (action === 'resolve') {
            if (report.itemId) {
                await Item.findByIdAndUpdate(report.itemId, { $set: { isReported: true } });
            }
            report.status = 'resolved';
            report.resolvedAt = new Date();
            await report.save();
            return res.json({ message: 'Report resolved. Item flagged as reported.', report });
        }

        if (action === 'dismiss') {
            report.status = 'dismissed';
            report.resolvedAt = new Date();
            await report.save();
            return res.json({ message: 'Report dismissed.', report });
        }
    } catch (e) {
        console.error('[Reports] patch error:', e);
        res.status(500).json({ message: 'Failed to update report' });
    }
});

module.exports = router;