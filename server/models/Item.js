const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,

    category: String,

    // price
    price: { type: Number, required: true },
    originalPrice: Number,
    brand: String,
    condition: {
        type: String,
        enum: ['Brand New', 'Like New', 'Good', 'Fair', 'Poor'],
        default: 'Good',
    },
    location: String,
    warranty: { type: Boolean, default: false },
    tags: { type: [String], default: [] },

    // image
    image: String,
    images: { type: [String], default: [] },

    sellerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isSold: { type: Boolean, default: false },
    isReported: { type: Boolean, default: false },
    isHidden:{ type: Boolean, default: false },
}, { timestamps: true });

ItemSchema.index({ title: 'text', description: 'text', brand: 'text', tags: 'text' });

module.exports = mongoose.model('Item', ItemSchema);