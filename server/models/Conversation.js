const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
    {
            itemId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
            buyerId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            sellerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            lastMsgAt:   { type: Date, default: Date.now },
            lastMsgText: { type: String, default: '' },
    },
    { timestamps: true }
);

conversationSchema.index({ itemId:1, buyerId:1, sellerId:1 }, { unique: true });

module.exports = mongoose.model('Conversation', conversationSchema);