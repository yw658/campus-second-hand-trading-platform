// backend/models/Message.js
const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
    {
        convoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
        senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        text: { type: String, trim: true, required: true },
        readBy: { type: [mongoose.Schema.Types.ObjectId], default: [] },
        isSystem: { type: Boolean, default: false }, // system/informative message
        meta: {
            type: Object,
            default: {}, // e.g., { itemId, orderId, title, price, image }
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Message', MessageSchema);