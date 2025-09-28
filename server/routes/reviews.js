const express = require('express');
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Item = require('../models/Item');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

const isId = (x) => mongoose.Types.ObjectId.isValid(x);
const SAFE_FILTER = { isHidden: { $ne: true }, isReported: { $ne: true } };

/* ============== 创建 / 修改 / 删除 ============== */

// 创建评价（鉴权）
router.post('/', requireAuth, async (req, res) => {
    try {
        const { itemId, rating, content = '', images = [] } = req.body || {};
        const userId = req.user?._id;

        if (!isId(itemId)) return res.status(400).json({ message: 'itemId is required' });
        if (typeof rating !== 'number' || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'rating must be between 1 and 5' });
        }

        // 查重
        const existed = await Review.findOne({
            itemId: new mongoose.Types.ObjectId(itemId),
            userId: new mongoose.Types.ObjectId(userId),
        }).select('_id').lean();

        if (existed) {
            // ⚠️ 一定返回 reviewId，前端才能 PATCH
            return res.status(409).json({
                message: 'You have already reviewed this item',
                reviewId: existed._id,
            });
        }

        const doc = await Review.create({ itemId, userId, rating, content, images });
        return res.status(201).json(doc);
    } catch (err) {
        if (err?.code === 11000) {
            try {
                const existed = await Review.findOne({
                    itemId: req.body?.itemId,
                    userId: req.user?._id,
                }).select('_id').lean();
                if (existed) {
                    return res.status(409).json({
                        message: 'You have already reviewed this item',
                        reviewId: existed._id,
                    });
                }
            } catch (_) {}
            return res.status(409).json({ message: 'You have already reviewed this item' });
        }
        console.error('[POST /api/reviews] error:', err);
        res.status(500).json({ message: 'Failed to create review' });
    }
});

// 更新评价（作者或管理员）
router.patch('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!isId(id)) return res.status(400).json({ message: 'Invalid review id' });

        const payload = {};
        if (typeof req.body.rating === 'number') {
            if (req.body.rating < 1 || req.body.rating > 5) {
                return res.status(400).json({ message: 'rating must be between 1 and 5' });
            }
            payload.rating = req.body.rating;
        }
        if (typeof req.body.content === 'string') payload.content = req.body.content.trim();
        if (Array.isArray(req.body.images)) payload.images = req.body.images;

        const cond = req.user?.isAdmin ? { _id: id } : { _id: id, userId: req.user?._id };
        const doc = await Review.findOneAndUpdate(cond, { $set: payload }, { new: true });
        if (!doc) return res.status(404).json({ message: 'Review not found or no permission' });
        res.json(doc);
    } catch (err) {
        console.error('[PATCH /api/reviews/:id] error:', err);
        res.status(500).json({ message: 'Failed to update review' });
    }
});

// 删除评价
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params;
        if (!isId(id)) return res.status(400).json({ message: 'Invalid review id' });
        const cond = req.user?.isAdmin ? { _id: id } : { _id: id, userId: req.user?._id };
        const ok = await Review.findOneAndDelete(cond);
        if (!ok) return res.status(404).json({ message: 'Review not found or no permission' });
        res.json({ ok: true });
    } catch (err) {
        console.error('[DELETE /api/reviews/:id] error:', err);
        res.status(500).json({ message: 'Failed to delete review' });
    }
});

/* ============== 查询 ============== */

// 商品的全部评价
router.get('/item/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        if (!isId(itemId)) return res.status(400).json({ message: 'Invalid item id' });

        const reviews = await Review.find({
            itemId: new mongoose.Types.ObjectId(itemId),
            ...SAFE_FILTER,
        })
            .sort({ createdAt: -1 })
            .lean();

        res.json(reviews);
    } catch (err) {
        console.error('[GET /api/reviews/item/:itemId] error:', err);
        res.status(500).json({ message: 'Failed to fetch reviews' });
    }
});

// 某用户写过的所有评价
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!isId(userId)) return res.status(400).json({ message: 'Invalid user id' });

        const reviews = await Review.find({
            userId: new mongoose.Types.ObjectId(userId),
            ...SAFE_FILTER,
        })
            .sort({ createdAt: -1 })
            .lean();

        res.json(reviews);
    } catch (err) {
        console.error('[GET /api/reviews/user/:userId] error:', err);
        res.status(500).json({ message: 'Failed to fetch user reviews' });
    }
});

// 卖家收到的所有评价（分页）
router.get('/seller/:sellerId', async (req, res) => {
    try {
        const { sellerId } = req.params;
        if (!isId(sellerId)) return res.status(400).json({ message: 'Invalid seller id' });

        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 50);

        const itemIds = await Item.find({ sellerId: new mongoose.Types.ObjectId(sellerId) })
            .select('_id title image images')
            .lean();

        if (!itemIds.length) {
            return res.json({ page, pageSize, total: 0, items: [] });
        }

        const idMap = new Map(itemIds.map(it => [String(it._id), it]));

        const match = {
            itemId: { $in: itemIds.map(it => it._id) },
            ...SAFE_FILTER,
        };

        const [items, total] = await Promise.all([
            Review.find(match)
                .sort({ createdAt: -1 })
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .lean(),
            Review.countDocuments(match),
        ]);

        const buyerIds = Array.from(new Set(items.map(r => String(r.userId)))).map(id => new mongoose.Types.ObjectId(id));
        const buyers = await User.find({ _id: { $in: buyerIds } }).select('_id username name').lean();
        const buyerMap = new Map(buyers.map(u => [String(u._id), u]));

        const merged = items.map(r => ({
            ...r,
            item: idMap.get(String(r.itemId)) || null,
            buyer: buyerMap.get(String(r.userId)) || null,
        }));

        res.json({ page, pageSize, total, items: merged });
    } catch (err) {
        console.error('[GET /api/reviews/seller/:sellerId] error:', err);
        res.status(500).json({ message: 'Failed to fetch seller reviews' });
    }
});

module.exports = router;