const express = require('express');
const router = express.Router();

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const requiredEnv = ['AWS_REGION', 'S3_BUCKET', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
const env = {
    REGION: process.env.AWS_REGION,
    BUCKET: process.env.S3_BUCKET,
    AK: process.env.AWS_ACCESS_KEY_ID,
    SK: process.env.AWS_SECRET_ACCESS_KEY,
    PUBLIC_BASE: process.env.S3_PUBLIC_BASE,
};

// check required env vars
const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length) {
    console.error(
        `[uploads] ❌ Missing env: ${missing.join(', ')}. ` +
        `Please add them in .env, e.g.：\n` +
        `AWS_REGION=us-east-1\nS3_BUCKET=your-bucket-name\nAWS_ACCESS_KEY_ID=...\nAWS_SECRET_ACCESS_KEY=...`
    );
}

console.log('[uploads] env check:', {
    AWS_REGION: env.REGION || '(missing)',
    S3_BUCKET: env.BUCKET || '(missing)',
    S3_PUBLIC_BASE: env.PUBLIC_BASE || '(unset)',
});

const s3 = new S3Client({ region: env.REGION });

/**
 * POST /api/uploads/presign
 * body: { filename, contentType, prefix? }
 * return：{ uploadUrl, fileUrl, key }
 */
router.post('/presign', async (req, res) => {
    try {
        // check env vars again at runtime
        const missNow = requiredEnv.filter((k) => !process.env[k]);
        if (missNow.length) {
            return res.status(500).json({
                message: `Server missing env: ${missNow.join(', ')}. Please set them in .env and restart.`,
            });
        }

        const { filename, contentType, prefix } = req.body || {};
        if (!filename || !contentType) {
            return res.status(400).json({ message: 'filename and contentType are required' });
        }

        // generate unique S3 key: prefix/timestamp_random_originalName
        const rand = Math.random().toString(36).slice(2, 8);
        const ts = Date.now();
        const safeName = String(filename).replace(/\s+/g, '_');
        const key = `${prefix ? `${String(prefix).replace(/\/+$/,'')}/` : ''}${ts}_${rand}_${safeName}`;

        const cmd = new PutObjectCommand({
            Bucket: env.BUCKET,
            Key: key,
            ContentType: contentType,
        });

        const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 60 * 5 });

        // public file URL: prefer S3_PUBLIC_BASE, fallback to AWS default
        const fileUrl = env.PUBLIC_BASE
            ? `${env.PUBLIC_BASE.replace(/\/+$/,'')}/${key}`
            : `https://${env.BUCKET}.s3.${env.REGION}.amazonaws.com/${key}`;

        res.json({ uploadUrl, fileUrl, key });
    } catch (e) {
        console.error('[presign] error:', e);
        if (String(e?.message || '').includes('HTTP label: Bucket')) {
            return res.status(500).json({ message: 'S3_BUCKET env is missing or empty' });
        }
        res.status(500).json({ message: 'failed to presign' });
    }
});

module.exports = router;