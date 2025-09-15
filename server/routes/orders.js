// backend/routes/orders.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Order = require('../models/Order');
const Item = require('../models/Item');
const Conversation = require('../models/Conversation'); // NEW
const Message = require('../models/Message');           // NEW

/**
 * Create order
 * POST /api/orders   body: { userId, itemId }
 */
router.post('/', async (req, res) => {
    try {
        const { userId, itemId } = req.body;
        if (!userId || !itemId) {
            return res.status(400).json({ message: 'userId and itemId are required' });
        }

        const buyerOid = new mongoose.Types.ObjectId(userId);
        const itemOid = new mongoose.Types.ObjectId(itemId);

        const item = await Item.findById(itemOid);
        if (!item) return res.status(404).json({ message: 'Item not found' });
        if (item.isSold) return res.status(409).json({ message: 'Item already sold' });

        // 1) Create order
        const order = await Order.create({
            buyerId: buyerOid,
            sellerId: item.sellerId,
            itemId: itemOid,
            price: item.price,
            status: 'created',
        });

        // 2) Mark item sold
        await Item.findByIdAndUpdate(itemOid, { isSold: true });

        // 3) Upsert conversation + system message with item attachment meta
        try {
            const convo = await Conversation.findOneAndUpdate(
                { itemId: itemOid, buyerId: buyerOid, sellerId: item.sellerId },
                { $setOnInsert: { itemId: itemOid, buyerId: buyerOid, sellerId: item.sellerId, lastMsgAt: new Date() } },
                { upsert: true, new: true }
            );

            const sysText = 'Order placed.';
            const meta = {
                orderId: order._id,
                itemId: item._id,
                title: item.title,
                price: item.price,
                image: item.image || (Array.isArray(item.images) && item.images[0]) || '',
            };

            await Message.create({
                convoId: convo._id,
                senderId: buyerOid, // triggered by buyer
                text: sysText,
                readBy: [buyerOid],
                isSystem: true,
                meta,
            });

            convo.lastMsgAt = new Date();
            convo.lastMsgText = sysText;
            await convo.save();
        } catch (e) {
            console.error('[orders] create -> system message error:', e);
        }

        res.status(201).json(order);
    } catch (err) {
        console.error('Create order error:', err);
        res.status(500).json({ message: 'Failed to create order' });
    }
});

/**
 * Buyer orders
 * GET /api/orders/user/:userId
 */
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ message: 'Invalid userId' });
        }

        const orders = await Order.find({ buyerId: new mongoose.Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .populate('itemId', 'title image images isSold price sellerId')
            .populate('sellerId', 'username');

        res.json(orders);
    } catch (err) {
        console.error('Fetch user orders error:', err);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

/**
 * Seller orders
 * GET /api/orders/seller/:sellerId
 */
router.get('/seller/:sellerId', async (req, res) => {
    try {
        const { sellerId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(sellerId)) {
            return res.status(400).json({ message: 'Invalid sellerId' });
        }

        const orders = await Order.find({ sellerId: new mongoose.Types.ObjectId(sellerId) })
            .sort({ createdAt: -1 })
            .populate('itemId', 'title image isSold price')
            .populate('buyerId', 'username');

        res.json(orders);
    } catch (err) {
        console.error('Fetch seller orders error:', err);
        res.status(500).json({ message: 'Failed to fetch orders' });
    }
});

/**
 * Confirm received (created -> completed)
 * PATCH /api/orders/:id/confirm-received
 * Auto system message: 'I have received the item.'
 */
router.patch('/:id/confirm-received', async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id).populate('itemId');
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.status !== 'created') {
            return res.status(400).json({ message: 'Only created orders can be confirmed' });
        }

        order.status = 'completed';
        await order.save();

        // System message
        try {
            const item = order.itemId;
            const convo = await Conversation.findOneAndUpdate(
                { itemId: item._id, buyerId: order.buyerId, sellerId: order.sellerId || item.sellerId },
                { $setOnInsert: { itemId: item._id, buyerId: order.buyerId, sellerId: order.sellerId || item.sellerId, lastMsgAt: new Date() } },
                { upsert: true, new: true }
            );

            const sysText = 'I have received the item. Thank you!';
            const meta = {
                orderId: order._id,
                itemId: item._id,
                title: item.title,
                price: order.price ?? item.price,
                image: item.image || (Array.isArray(item.images) && item.images[0]) || '',
            };

            await Message.create({
                convoId: convo._id,
                senderId: order.buyerId,
                text: sysText,
                readBy: [order.buyerId],
                isSystem: true,
                meta,
            });

            convo.lastMsgAt = new Date();
            convo.lastMsgText = sysText;
            await convo.save();
        } catch (e) {
            console.error('[orders] confirm -> system message error:', e);
        }

        res.json({ message: 'Order completed', order });
    } catch (err) {
        console.error('Confirm received error:', err);
        res.status(500).json({ message: 'Failed to confirm' });
    }
});

/**
 * Cancel order (created -> cancelled) + restore item for sale
 * PATCH /api/orders/:id/cancel
 * Auto system message: 'The order has been cancelled.'
 */
router.patch('/:id/cancel', async (req, res) => {
    try {
        const { id } = req.params;
        const order = await Order.findById(id).populate('itemId');
        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (order.status !== 'created') {
            return res.status(400).json({ message: 'Only created orders can be cancelled' });
        }

        order.status = 'cancelled';
        await order.save();

        // Restore item availability
        await Item.findByIdAndUpdate(order.itemId._id || order.itemId, { isSold: false });

        // System message
        try {
            const item = order.itemId;
            const convo = await Conversation.findOneAndUpdate(
                { itemId: item._id, buyerId: order.buyerId, sellerId: order.sellerId || item.sellerId },
                { $setOnInsert: { itemId: item._id, buyerId: order.buyerId, sellerId: order.sellerId || item.sellerId, lastMsgAt: new Date() } },
                { upsert: true, new: true }
            );

            const sysText = 'The order has been cancelled.';
            const meta = {
                orderId: order._id,
                itemId: item._id,
                title: item.title,
                price: order.price ?? item.price,
                image: item.image || (Array.isArray(item.images) && item.images[0]) || '',
            };

            await Message.create({
                convoId: convo._id,
                senderId: order.buyerId, // or sellerId if you prefer
                text: sysText,
                readBy: [order.buyerId],
                isSystem: true,
                meta,
            });

            convo.lastMsgAt = new Date();
            convo.lastMsgText = sysText;
            await convo.save();
        } catch (e) {
            console.error('[orders] cancel -> system message error:', e);
        }

        res.json({ message: 'Order cancelled', order });
    } catch (err) {
        console.error('Cancel order error:', err);
        res.status(500).json({ message: 'Failed to cancel order' });
    }
});

module.exports = router;