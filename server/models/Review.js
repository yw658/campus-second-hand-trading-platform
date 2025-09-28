// backend/models/Review.js
const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema(
    {
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Item',
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
        },
        content: {
            type: String,
            default: '',
            trim: true,
        },
        images: {
            type: [String],
            default: [],
        },
        isReported: { type: Boolean, default: false },
        isHidden: { type: Boolean, default: false },
    },
    { timestamps: true }
);

// 唯一约束：一个用户只能对一个商品评价一次
ReviewSchema.index({ itemId: 1, userId: 1 }, { unique: true });
// 常用索引
ReviewSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Review', ReviewSchema);