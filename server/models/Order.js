const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
    {
            buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
            price: { type: Number, required: true },
            status: {
                    type: String,
                    enum: ['created', 'completed', 'cancelled'],
                    default: 'created',
            },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);