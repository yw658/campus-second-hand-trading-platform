// backend/routes/items.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Item = require('../models/Item');
const Favorite = require('../models/Favorite');

/* ========== Create Item ========== */
// 可选：如果你有 auth 中间件，放在这里：router.post('/', auth, async (req,res)=>{...})
router.post('/', async (req, res) => {
    try {
        const {
            title,
            description = '',
            category = 'Other',
            price,
            originalPrice,
            brand = '',
            condition = 'Good',
            location = '',
            warranty = false,
            tags = [],
            image = '',
            images = [],
            sellerId,             // ★ 必须传
        } = req.body || {};

        if (!sellerId || !mongoose.Types.ObjectId.isValid(sellerId)) {
            return res.status(400).json({ message: 'sellerId is required' });
        }
        if (!title || typeof price === 'undefined' || price === null) {
            return res.status(400).json({ message: 'title and price are required' });
        }

        const doc = await Item.create({
            title,
            description,
            category,
            price,
            originalPrice,
            brand,
            condition,
            location,
            warranty,
            tags,
            image: image || (Array.isArray(images) && images[0]) || '',
            images: Array.isArray(images) ? images : [],
            sellerId: new mongoose.Types.ObjectId(sellerId),
        });

        return res.status(201).json(doc);
    } catch (err) {
        console.error('[POST /api/items] create error:', err);
        // 常见验证错误处理
        if (err?.name === 'ValidationError') {
            return res.status(400).json({ message: err.message });
        }
        return res.status(500).json({ message: 'Failed to create item' });
    }
});

/* ========== List (with sold items, excluding reported) ========== */
// GET /api/items?search=&category=&page=&pageSize=&sort=
router.get('/', async (req, res) => {
    try {
        const {
            search = '',
            category = '',
            page = 1,
            pageSize = 12,
            sort = 'latest'
        } = req.query;

        const p = Math.max(parseInt(page, 10) || 1, 1);
        const ps = Math.min(Math.max(parseInt(pageSize, 10) || 12, 1), 48);

        const filter = { isReported: { $ne: true } }; // 不再过滤 isSold
        if (category) filter.category = category;
        if (search) filter.title = { $regex: search, $options: 'i' };

        let sortSpec = { createdAt: -1 };
        if (sort === 'priceAsc') sortSpec = { price: 1 };
        if (sort === 'priceDesc') sortSpec = { price: -1 };
        if (sort === 'popular') sortSpec = { createdAt: -1 }; // 预留

        const [items, total] = await Promise.all([
            Item.find(filter).sort(sortSpec).skip((p - 1) * ps).limit(ps),
            Item.countDocuments(filter),
        ]);

        res.json({ page: p, pageSize: ps, total, items });
    } catch (err) {
        console.error('Fetch items error:', err.message);
        res.status(500).json({ message: 'Failed to fetch items' });
    }
});

/* ========== Items by Seller ========== */
// GET /api/items/seller/:sellerId?status=active|sold|all
router.get('/seller/:sellerId', async (req, res) => {
    try {
        const { sellerId } = req.params;
        const { status } = req.query;

        if (!mongoose.Types.ObjectId.isValid(sellerId)) {
            return res.status(400).json({ message: 'Invalid sellerId' });
        }

        const filter = {
            sellerId: new mongoose.Types.ObjectId(sellerId),
            isReported: { $ne: true },
        };
        if (status === 'active') filter.isSold = false;
        if (status === 'sold')   filter.isSold = true;

        const items = await Item.find(filter).sort({ createdAt: -1 });
        res.json(items);
    } catch (err) {
        console.error('Fetch seller items error:', err.message);
        res.status(500).json({ message: 'Failed to fetch seller items' });
    }
});

/* ========== Detail (with isFavorited) ========== */
// GET /api/items/:id?userId=xxx
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: 'Invalid item id' });
        }

        const item = await Item.findById(id).lean();
        if (!item) return res.status(404).json({ message: 'Item not found' });

        let isFavorited = false;
        if (userId && mongoose.Types.ObjectId.isValid(userId)) {
            const fav = await Favorite.findOne({
                userId: new mongoose.Types.ObjectId(userId),
                itemId: new mongoose.Types.ObjectId(id),
            });
            isFavorited = !!fav;
        }

        res.json({ ...item, isFavorited });
    } catch (err) {
        console.error('Fetch item detail error:', err.message);
        res.status(500).json({ message: 'Failed to fetch item' });
    }
});

module.exports = router;