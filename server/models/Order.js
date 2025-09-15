const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
    {
            buyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },   // 买家
            sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // 卖家
            itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },   // 商品
            price: { type: Number, required: true },                                          // 下单时的价格快照
            status: {
                    type: String,
                    enum: ['created', 'completed', 'cancelled'], // 只要这三个
                    default: 'created',
            },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);