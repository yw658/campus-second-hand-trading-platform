const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// ========== Routes ==========
const authRoutes = require('./routes/auth');
const itemRoutes = require('./routes/items');
const orderRoutes = require('./routes/orders');
const favoriteRoutes = require('./routes/favorites');
const userRoutes = require('./routes/users');
const uploadRoutes = require('./routes/uploads');
const convoRoutes = require('./routes/convos');
const adminRoutes = require('./routes/admin');
const reportRoutes = require('./routes/reports');
const reviewsRouter = require('./routes/reviews');

// ========== App ==========
const app = express();
const PORT = Number(process.env.PORT || 5002);

// --- Security & Proxy ---
app.set('trust proxy', 1);
app.use(helmet());

// --- CORS (allowlist from env, allow no-origin like curl/healthz, handle preflight) ---
const allowlist = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

const corsOpts = {
    origin(origin, cb) {
        if (!origin) return cb(null, true); // curl / 健康检查
        if (allowlist.length === 0 || allowlist.includes(origin)) return cb(null, true);
        return cb(null, false); // 不抛异常，避免 500
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    preflightContinue: false,
    optionsSuccessStatus: 204
};

app.use(cors(corsOpts));
app.options('*', cors(corsOpts));

// --- Body Parser ---
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// --- Basic Rate Limit ---
app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 200 }));

// --- Health Check ---
app.get('/healthz', (_req, res) => res.status(200).json({ ok: true }));

// ========== API Routes ==========
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/users', userRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/convos', convoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reviews', reviewsRouter);

// --- Root ---
app.get('/', (_req, res) => res.send('Backend working!'));

// --- 404 ---
app.use((req, res) => {
    res.status(404).json({ message: 'Not found', path: req.originalUrl });
});

// --- Error Handler ---
/* eslint-disable no-unused-vars */
app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';
    console.error('[Error]', message, err?.stack || '');
    res.status(status).json({ message });
});
/* eslint-enable no-unused-vars */

// ========== Bootstrap ==========
let server;

async function start() {
    try {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error('MONGODB_URI is missing in .env');

        await mongoose.connect(uri);
        console.log('[MongoDB] Connected.');

        mongoose.connection.on('error', (e) => console.error('[MongoDB error]', e?.message || e));
        mongoose.connection.on('disconnected', () => console.warn('[MongoDB] disconnected'));

        server = app.listen(PORT, () => console.log(`[HTTP] Server running on :${PORT}`));
    } catch (err) {
        console.error('[Startup Error]', err?.message || err);
        process.exit(1);
    }
}
start();

// ========== Graceful Shutdown ==========
async function shutdown(signal) {
    console.log(`\n[Shutdown] Received ${signal}. Closing...`);
    try {
        if (server) {
            await new Promise((resolve, reject) =>
                server.close((e) => (e ? reject(e) : resolve()))
            );
        }
        await mongoose.connection.close();
        console.log('[Shutdown] MongoDB closed. Bye.');
        process.exit(0);
    } catch (e) {
        console.error('[Shutdown Error]', e);
        process.exit(1);
    }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
});