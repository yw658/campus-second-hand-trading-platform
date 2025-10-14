const express = require('express');
const router = express.Router();

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Item = require('../models/Item');
const { requireAuth } = require('../middleware/auth');

// -------------------------------
// Create or get a conversation
// POST /api/convos
// - Buyer: only need itemId
// - Seller: need itemId + buyerId
// -------------------------------
router.post('/', requireAuth, async (req, res) => {
    try {
        const userId = req.user._id.toString();
        const { itemId, buyerId } = req.body;

        if (!itemId) return res.status(400).json({ message: 'itemId required' });

        const item = await Item.findById(itemId).lean();
        if (!item) return res.status(404).json({ message: 'Item not found' });

        const sellerId = item.sellerId?.toString();
        if (!sellerId) return res.status(400).json({ message: 'Item.sellerId missing' });

        let realBuyerId = userId;

        // if seller creates convo, must specify buyerId
        if (userId === sellerId) {
            if (!buyerId) return res.status(400).json({ message: 'buyerId required when seller initiates' });
            realBuyerId = buyerId.toString();
            if (realBuyerId === sellerId) return res.status(400).json({ message: 'Seller cannot talk to self' });
        }

        // upsert convo
        const query = { itemId, buyerId: realBuyerId, sellerId };
        const update = { $setOnInsert: { itemId, buyerId: realBuyerId, sellerId, lastMsgAt: new Date() } };

        const convo = await Conversation.findOneAndUpdate(query, update, { upsert: true, new: true });

        // populate with related info
        const populated = await Conversation.findById(convo._id)
            .populate('itemId', 'title price image sellerId')
            .populate('buyerId', 'username email')
            .populate('sellerId', 'username email');

        res.json(populated);
    } catch (err) {
        if (err.code === 11000) {
            // handle duplicate key race condition
            const exists = await Conversation.findOne({
                itemId: req.body.itemId,
                buyerId: req.body.buyerId || req.user._id,
            });
            if (exists) return res.json(exists);
        }
        res.status(500).json({ message: err.message });
    }
});

// -------------------------------
// Get my conversation list
// GET /api/convos?role=buyer|seller&page=1&pageSize=20
// -------------------------------
router.get('/', requireAuth, async (req, res) => {
    const userId = req.user._id.toString();
    const { role = 'all', page = 1, pageSize = 20 } = req.query;

    let filter = { $or: [{ buyerId: userId }, { sellerId: userId }] };
    if (role === 'buyer') filter = { buyerId: userId };
    if (role === 'seller') filter = { sellerId: userId };

    const skip = (Number(page) - 1) * Number(pageSize);

    const [rows, total] = await Promise.all([
        Conversation.find(filter)
            .sort({ lastMsgAt: -1 })
            .skip(skip)
            .limit(Number(pageSize))
            .populate('itemId', 'title price image sellerId')
            .populate('buyerId', 'username email')
            .populate('sellerId', 'username email')
            .lean(),
        Conversation.countDocuments(filter),
    ]);

    res.json({ rows, total, page: Number(page), pageSize: Number(pageSize) });
});

// -------------------------------
// Get messages of a conversation
// GET /api/convos/:id/messages?page=1&pageSize=30
// Only participants can access
// -------------------------------
router.get('/:id/messages', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { page = 1, pageSize = 30 } = req.query;
    const userId = req.user._id.toString();

    const convo = await Conversation.findById(id).lean();
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });
    if (userId !== convo.buyerId.toString() && userId !== convo.sellerId.toString())
        return res.status(403).json({ message: 'Forbidden' });

    const skip = (Number(page) - 1) * Number(pageSize);

    const [rows, total] = await Promise.all([
        Message.find({ convoId: id }).sort({ createdAt: 1 }).skip(skip).limit(Number(pageSize)).lean(),
        Message.countDocuments({ convoId: id }),
    ]);

    res.json({ rows, total, page: Number(page), pageSize: Number(pageSize) });
});

// -------------------------------
// Send a message
// POST /api/convos/:id/messages
// body: { text }
// -------------------------------
router.post('/:id/messages', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user._id.toString();

    if (!text || !text.trim()) return res.status(400).json({ message: 'text required' });

    const convo = await Conversation.findById(id);
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });

    const buyerId = convo.buyerId.toString();
    const sellerId = convo.sellerId.toString();
    if (userId !== buyerId && userId !== sellerId)
        return res.status(403).json({ message: 'Forbidden' });

    // create message
    const msg = await Message.create({
        convoId: id,
        senderId: userId,
        text: text.trim(),
        readBy: [userId],
    });

    // update convo meta
    convo.lastMsgAt = new Date();
    convo.lastMsgText = text.slice(0, 120);
    await convo.save();

    res.status(201).json(msg);
});

// -------------------------------
// Mark all messages as read
// PATCH /api/convos/:id/read
// -------------------------------
router.patch('/:id/read', requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.user._id.toString();

    const convo = await Conversation.findById(id);
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });

    const buyerId = convo.buyerId.toString();
    const sellerId = convo.sellerId.toString();
    if (userId !== buyerId && userId !== sellerId)
        return res.status(403).json({ message: 'Forbidden' });

    // mark all opponent's messages as read
    const result = await Message.updateMany(
        { convoId: id, senderId: { $ne: userId }, readBy: { $ne: userId } },
        { $addToSet: { readBy: userId } }
    );

    res.json({ ok: true, matched: result.matchedCount, modified: result.modifiedCount });
});

module.exports = router;