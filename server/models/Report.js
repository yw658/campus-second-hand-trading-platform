const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
    {
            itemId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
            reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
            reason:     { type: String, required: true, trim: true, minlength: 4, maxlength: 500 },

            // pending: waiting for review; resolved: accepted; dismissed: rejected
            status:     { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
            resolvedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

// helpful index for admin view
ReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Report', ReportSchema);