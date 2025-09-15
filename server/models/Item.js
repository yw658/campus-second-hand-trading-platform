const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,

    // 分类（仍然用你现有的纯文本分类）
    category: String,

    // 价格
    price: { type: Number, required: true },
    originalPrice: Number, // 可选：原价

    // 新增属性
    brand: String,
    condition: {
        type: String,
        enum: ['Brand New', 'Like New', 'Good', 'Fair', 'Poor'],
        default: 'Good',
    },
    location: String,
    warranty: { type: Boolean, default: false },
    tags: { type: [String], default: [] },

    // 图片
    image: String,            // 兼容旧字段的封面
    images: { type: [String], default: [] }, // 多图（前端先用 dataURL 保存）

    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isSold: { type: Boolean, default: false },
    isReported: { type: Boolean, default: false },
    isHidden:{ type: Boolean, default: false },
}, { timestamps: true });

// 简单文本索引，便于以后做搜索
ItemSchema.index({ title: 'text', description: 'text', brand: 'text', tags: 'text' });

module.exports = mongoose.model('Item', ItemSchema);